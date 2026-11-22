
// src/app/api/bills/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isAuthorizedOwner() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getOwnerCookieName())?.value;
    return await verifyOwnerSession(token);
}

// GET: Bill history
export async function GET(request) {
    try {
        if (!(await isAuthorizedOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search")?.trim();
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const branchId = searchParams.get("branchId");

        if (branchId && !UUID.test(branchId)) {
            return NextResponse.json(
                { error: "Invalid branch ID." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        let query = supabase
            .from("bills")
            .select(`
                id,
                bill_number,
                branch_id,
                customer_name,
                customer_phone,
                subtotal,
                total_amount,
                status,
                bill_date,
                created_at,
                branch:branches (
                    id,
                    name
                )
            `)
            .order("bill_date", { ascending: false })
            .limit(200);

        if (branchId) {
            query = query.eq("branch_id", branchId);
        }

        if (from) {
            const fromDate = new Date(from);
            if (Number.isNaN(fromDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid start date." },
                    { status: 400 }
                );
            }
            query = query.gte("bill_date", fromDate.toISOString());
        }

        if (to) {
            const toDate = new Date(to);
            if (Number.isNaN(toDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid end date." },
                    { status: 400 }
                );
            }

            // Include the complete selected end date.
            toDate.setHours(23, 59, 59, 999);
            query = query.lte("bill_date", toDate.toISOString());
        }

        if (search) {
            const safeSearch = search.replace(/[,%()]/g, " ").trim();

            if (safeSearch) {
                query = query.or(
                    `bill_number.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%,customer_phone.ilike.%${safeSearch}%`
                );
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (error) {
        console.error("Bills GET:", error);

        return NextResponse.json(
            { error: "Unable to load bill history." },
            { status: 500 }
        );
    }
}

// POST: Create bill and deduct stock atomically
export async function POST(request) {
    try {
        if (!(await isAuthorizedOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            branchId,
            customerName,
            customerPhone,
            items,
            billDate,
            negotiatedTotal,
        } = body;

        if (!UUID.test(branchId || "")) {
            return NextResponse.json(
                { error: "Please select a valid branch." },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Add at least one item to the bill." },
                { status: 400 }
            );
        }

        if (items.length > 100) {
            return NextResponse.json(
                { error: "A bill cannot contain more than 100 items." },
                { status: 400 }
            );
        }

        if (
            customerName != null &&
            typeof customerName !== "string"
        ) {
            return NextResponse.json(
                { error: "Invalid customer name." },
                { status: 400 }
            );
        }

        if (
            customerPhone != null &&
            typeof customerPhone !== "string"
        ) {
            return NextResponse.json(
                { error: "Invalid customer phone." },
                { status: 400 }
            );
        }

        let parsedBillDate = null;

        if (billDate) {
            const date = new Date(billDate);

            if (Number.isNaN(date.getTime())) {
                return NextResponse.json(
                    { error: "Invalid bill date." },
                    { status: 400 }
                );
            }

            parsedBillDate = date.toISOString();
        }

        const rpcItems = [];

        for (const item of items) {
            const subProductId = item?.subProductId;
            const quantity = item?.quantity;

            if (!UUID.test(subProductId || "")) {
                return NextResponse.json(
                    { error: "Invalid sub-product in bill." },
                    { status: 400 }
                );
            }

            if (
                !Number.isSafeInteger(quantity) ||
                quantity <= 0
            ) {
                return NextResponse.json(
                    {
                        error: "Item quantity must be a positive whole number.",
                    },
                    { status: 400 }
                );
            }

            rpcItems.push({
                sub_product_id: subProductId,
                quantity,
            });
        }

        const supabase = createAdminClient();

        const finalTotal = Number(negotiatedTotal);

        if (
            !Number.isFinite(finalTotal) ||
            finalTotal < 0 ||
            Math.round(finalTotal * 100) !== finalTotal * 100
        ) {
            return NextResponse.json(
                { error: "Enter a valid negotiated grand total." },
                { status: 400 }
            );
        }

        const rpcArgs = {
            p_branch_id: branchId,
            p_items: rpcItems,
            p_customer_name: customerName?.trim() || null,
            p_customer_phone: customerPhone?.trim() || null,
            p_negotiated_total: finalTotal,
        };

        if (parsedBillDate) {
            rpcArgs.p_bill_date = parsedBillDate;
        }

        const { data, error } = await supabase.rpc(
            "create_bill",
            rpcArgs
        );

        if (error) {
            console.error("Create bill RPC:", error);

            return NextResponse.json(
                { error: error.message || "Unable to create bill." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            bill: data,
        });
    } catch (error) {
        console.error("Bills POST:", error);

        return NextResponse.json(
            { error: "Unable to create bill." },
            { status: 500 }
        );
    }
}
