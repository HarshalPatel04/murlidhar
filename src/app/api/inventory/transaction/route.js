import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        // Verify owner session before accessing the database.
        const cookieStore = await cookies();

        const token = cookieStore.get(
            getOwnerCookieName()
        )?.value;

        const isOwner = await verifyOwnerSession(token);

        if (!isOwner) {
            return NextResponse.json(
                {
                    error: "Unauthorized. Owner login required.",
                },
                { status: 401 }
            );
        }

        // Parse and validate the request.
        const body = await request.json();

        const {
            branchId,
            productId,
            type,
            quantity,
            transactionAt,
        } = body;

        if (
            !branchId ||
            !productId ||
            !type ||
            quantity === undefined ||
            !transactionAt
        ) {
            return NextResponse.json(
                {
                    error: "Missing required transaction information.",
                },
                { status: 400 }
            );
        }

        if (!["purchase", "sale"].includes(type)) {
            return NextResponse.json(
                {
                    error: "Invalid transaction type.",
                },
                { status: 400 }
            );
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            return NextResponse.json(
                {
                    error: "Quantity must be a positive whole number.",
                },
                { status: 400 }
            );
        }

        if (
            typeof transactionAt !== "string" ||
            Number.isNaN(Date.parse(transactionAt))
        ) {
            return NextResponse.json(
                {
                    error: "Invalid transaction date or time.",
                },
                { status: 400 }
            );
        }

        // Use the trusted server-side Supabase client.
        const supabase = createAdminClient();

        const { data, error } = await supabase.rpc(
            "record_inventory_transaction",
            {
                p_branch_id: branchId,
                p_product_id: productId,
                p_type: type,
                p_quantity: quantity,
                p_transaction_at: transactionAt,
            }
        );

        if (error) {
            console.error(
                "Transaction RPC error:",
                error.message
            );

            return NextResponse.json(
                {
                    error: "Unable to record transaction.",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            transaction: data,
        });
    } catch (error) {
        console.error(
            "Transaction API error:",
            error.message
        );

        return NextResponse.json(
            {
                error: "Unable to record transaction.",
            },
            { status: 500 }
        );
    }
}