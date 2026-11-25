
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

const VALID_TYPES = ["purchase", "sale", "add", "remove"];

function validatePrice(value, fieldName, required = false) {
    if (value === undefined || value === null || value === "") {
        if (required) {
            return {
                valid: false,
                error: `${fieldName} is required.`,
            };
        }

        return { valid: true, value: null };
    }

    const price = Number(value);

    if (
        !Number.isFinite(price) ||
        price < 0 ||
        price > 9999999999.99 ||
        Math.abs(price * 100 - Math.round(price * 100)) > 0.000001
    ) {
        return {
            valid: false,
            error: `${fieldName} must be a valid non-negative amount with up to 2 decimal places.`,
        };
    }

    return {
        valid: true,
        value: Number(price.toFixed(2)),
    };
}

export async function POST(request) {
    try {
        // OWNER AUTHENTICATION
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
            purchasePrice,
            sellingPrice,
            transactionTotal,
        } = body;

        // BASIC VALIDATION
        if (
            !UUID.test(branchId || "") ||
            !UUID.test(subProductId || "")
        ) {
            return NextResponse.json(
                { error: "Valid branch and sub-product are required." },
                { status: 400 }
            );
        }

        if (!VALID_TYPES.includes(type)) {
            return NextResponse.json(
                { error: "Invalid transaction type." },
                { status: 400 }
            );
        }

        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            return NextResponse.json(
                { error: "Quantity must be a positive whole number." },
                { status: 400 }
            );
        }

        if (
            typeof transactionAt !== "string" ||
            Number.isNaN(Date.parse(transactionAt))
        ) {
            return NextResponse.json(
                { error: "Invalid transaction date or time." },
                { status: 400 }
            );
        }

        // PRICE VALIDATION
        let price = { valid: true, value: null };
        let selling = { valid: true, value: null };

        if (type === "purchase") {
            price = validatePrice(
                purchasePrice,
                "Purchase price",
                true
            );

            selling = validatePrice(
                sellingPrice,
                "Selling price"
            );
        }

        if (type === "sale") {
            price = validatePrice(
                transactionTotal,
                "Total negotiated selling amount",
                true
            );
        }

        if (!price.valid) {
            return NextResponse.json(
                { error: price.error },
                { status: 400 }
            );
        }

        if (!selling.valid) {
            return NextResponse.json(
                { error: selling.error },
                { status: 400 }
            );
        }

        // VALIDATE DATABASE RECORDS
        const supabase = createAdminClient();

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

        // BUILD RPC ARGUMENTS
        const rpcArgs = {
            p_branch_id: branchId,
            p_sub_product_id: subProductId,
            p_type: type,
            p_quantity: quantity,
            p_transaction_at: new Date(
                transactionAt
            ).toISOString(),
        };

        if (type === "purchase") {
            rpcArgs.p_purchase_price = price.value;
            rpcArgs.p_selling_price = selling.value;
        }

        if (type === "sale") {
            rpcArgs.p_transaction_total = price.value;
        }

        // ADD AND REMOVE DO NOT SEND ANY PRICE FIELDS.
        // Their price fields remain unchanged.

        const { data, error } = await supabase.rpc(
            "record_sub_product_transaction",
            rpcArgs
        );

        if (error) {
            console.error(
                "Sub-product transaction RPC:",
                error
            );

            return NextResponse.json(
                {
                    error:
                        error.message ||
                        "Unable to record transaction.",
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
            "Sub-product transaction API:",
            error
        );

        return NextResponse.json(
            { error: "Unable to record transaction." },
            { status: 500 }
        );
    }
}
