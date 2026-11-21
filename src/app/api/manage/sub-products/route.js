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


export async function GET(request) {
    try {
        // Verify owner session
        const cookieStore = await cookies();
        const token = cookieStore.get(
            getOwnerCookieName()
        )?.value;

        const isOwner = await verifyOwnerSession(token);

        if (!isOwner) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!UUID.test(productId || "")) {
            return NextResponse.json(
                { error: "Valid product ID is required." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const [
            productResult,
            subProductsResult,
            branchesResult,
            inventoryResult,
        ] = await Promise.all([
            supabase
                .from("products")
                .select("id, name, category_id, brand_id")
                .eq("id", productId)
                .eq("is_active", true)
                .maybeSingle(),

            supabase
                .from("sub_products")
                .select(`
                    id,
                    product_id,
                    name,
                    image_url,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq("product_id", productId)
                .order("name"),

            supabase
                .from("branches")
                .select("id, name, is_active")
                .order("name"),

            supabase
                .from("sub_product_inventory")
                .select("branch_id, sub_product_id, quantity"),
        ]);

        if (productResult.error) throw productResult.error;
        if (subProductsResult.error) throw subProductsResult.error;
        if (branchesResult.error) throw branchesResult.error;
        if (inventoryResult.error) throw inventoryResult.error;

        if (!productResult.data) {
            return NextResponse.json(
                { error: "Product not found or inactive." },
                { status: 404 }
            );
        }

        // Combine duplicate inventory rows safely.
        const inventoryMap = {};

        for (const item of inventoryResult.data || []) {
            const key = `${item.sub_product_id}_${item.branch_id}`;

            inventoryMap[key] =
                (inventoryMap[key] || 0) +
                (Number(item.quantity) || 0);
        }

        // Attach branch-wise stock to every sub-product.
        const subProducts = (
            subProductsResult.data || []
        ).map((subProduct) => ({
            ...subProduct,

            branches: (branchesResult.data || []).map(
                (branch) => ({
                    id: branch.id,
                    name: branch.name,
                    is_active: branch.is_active,

                    quantity:
                        inventoryMap[
                        `${subProduct.id}_${branch.id}`
                        ] ?? 0,
                })
            ),
        }));

        return NextResponse.json({
            product: productResult.data,
            data: subProducts,
            branches: branchesResult.data || [],
        });

    } catch (error) {
        console.error("Sub-products GET:", error);

        return NextResponse.json(
            { error: "Unable to load sub-products." },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        // Verify owner session
        const cookieStore = await cookies();
        const token = cookieStore.get(
            getOwnerCookieName()
        )?.value;

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

        // Validate date/time
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

        // Verify active sub-product and branch
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

        // Record transaction through Supabase RPC
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
            console.error(
                "Sub-product transaction RPC:",
                error
            );

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
