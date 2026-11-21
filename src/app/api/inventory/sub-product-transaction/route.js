
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

export async function POST(request) {
    try {
        // Verify owner session
        const cookieStore = await cookies();
        const token = cookieStore.get(getOwnerCookieName())?.value;

        const isOwner = await verifyOwnerSession(token);

        if (!isOwner) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            branchId,
            subProductId,
            type,
            quantity,
            transactionAt,
        } = body;

        // Validate IDs
        if (
            !UUID.test(branchId || "") ||
            !UUID.test(subProductId || "")
        ) {
            return NextResponse.json(
                { error: "Valid branch and sub-product are required." },
                { status: 400 }
            );
        }

        // Validate transaction type
        if (!["purchase", "sale"].includes(type)) {
            return NextResponse.json(
                { error: "Invalid transaction type." },
                { status: 400 }
            );
        }

        // Validate quantity
        if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            return NextResponse.json(
                { error: "Quantity must be a positive whole number." },
                { status: 400 }
            );
        }

        // Validate transaction date
        if (
            typeof transactionAt !== "string" ||
            Number.isNaN(Date.parse(transactionAt))
        ) {
            return NextResponse.json(
                { error: "Invalid transaction date or time." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Validate active sub-product and branch
        const [
            { data: subProduct, error: subProductError },
            { data: branch, error: branchError },
        ] = await Promise.all([
            supabase
                .from("sub_products")
                .select("id, is_active")
                .eq("id", subProductId)
                .maybeSingle(),

            supabase
                .from("branches")
                .select("id")
                .eq("id", branchId)
                .eq("is_active", true)
                .maybeSingle(),
        ]);

        if (subProductError || branchError) {
            console.error(
                "Transaction validation:",
                subProductError || branchError
            );

            return NextResponse.json(
                { error: "Unable to validate stock item." },
                { status: 500 }
            );
        }

        if (!subProduct || !subProduct.is_active) {
            return NextResponse.json(
                { error: "Sub-product not found or inactive." },
                { status: 404 }
            );
        }

        if (!branch) {
            return NextResponse.json(
                { error: "Branch not found or inactive." },
                { status: 404 }
            );
        }

        // Record stock transaction
        const { data, error } = await supabase.rpc(
            "record_sub_product_transaction",
            {
                p_branch_id: branchId,
                p_sub_product_id: subProductId,
                p_type: type,
                p_quantity: quantity,
                p_transaction_at: new Date(
                    transactionAt
                ).toISOString(),
            }
        );

        if (error) {
            console.error("Sub-product transaction RPC:", error);

            return NextResponse.json(
                { error: error.message || "Unable to record transaction." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            transaction: data,
        });

    } catch (error) {
        console.error("Sub-product transaction API:", error);

        return NextResponse.json(
            { error: "Unable to record transaction." },
            { status: 500 }
        );
    }
}
