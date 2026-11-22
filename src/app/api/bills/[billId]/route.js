
// src/app/api/bills/[billId]/route.js

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

export async function GET(request, { params }) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(getOwnerCookieName())?.value;

        if (!(await verifyOwnerSession(token))) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const { billId } = await params;

        if (!UUID.test(billId || "")) {
            return NextResponse.json(
                { error: "Invalid bill ID." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("bills")
            .select(`
                *,
                branch:branches (
                    id,
                    name,
                    address,
                    phone
                ),
                items:bill_items (
                    id,
                    sub_product_id,
                    sub_product_name,
                    quantity,
                    purchase_price,
                    default_selling_price,
                    final_selling_price,
                    line_total,
                    profit,
                    created_at
                )
            `)
            .eq("id", billId)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return NextResponse.json(
                { error: "Bill not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Bill detail GET:", error);

        return NextResponse.json(
            { error: "Unable to load bill details." },
            { status: 500 }
        );
    }
}
