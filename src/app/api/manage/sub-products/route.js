
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

async function isOwnerAuthenticated() {
    const cookieStore = await cookies();

    const token = cookieStore.get(
        getOwnerCookieName()
    )?.value;

    return await verifyOwnerSession(token);
}

function jsonError(message, status = 400) {
    return NextResponse.json(
        { error: message },
        { status }
    );
}

function isValidUUID(value) {
    return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    );
}

function isValidQuantity(value) {
    return (
        Number.isSafeInteger(value) &&
        value >= 0
    );
}

async function recordSubProductTransaction(
    supabase,
    branchId,
    subProductId,
    type,
    quantity
) {
    if (quantity <= 0) return;

    const { error } = await supabase.rpc(
        "record_sub_product_transaction",
        {
            p_branch_id: branchId,
            p_sub_product_id: subProductId,
            p_type: type,
            p_quantity: quantity,
            p_transaction_at: new Date().toISOString(),
        }
    );

    if (error) throw error;
}

async function recordPurchase(
    supabase,
    branchId,
    subProductId,
    quantity
) {
    return recordSubProductTransaction(
        supabase,
        branchId,
        subProductId,
        "purchase",
        quantity
    );
}

async function recordSale(
    supabase,
    branchId,
    subProductId,
    quantity
) {
    return recordSubProductTransaction(
        supabase,
        branchId,
        subProductId,
        "sale",
        quantity
    );
}

// --------------------------------------------------
// GET: LOAD SUB-PRODUCTS WITH BRANCH-WISE STOCK
// --------------------------------------------------

export async function GET(request) {
    if (!(await isOwnerAuthenticated())) {
        return jsonError(
            "Unauthorized. Owner login required.",
            401
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        if (!isValidUUID(productId)) {
            return jsonError("Valid product ID is required.");
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
            return jsonError("Product not found or inactive.", 404);
        }

        const inventoryMap = {};

        for (const item of inventoryResult.data || []) {
            const key = `${item.sub_product_id}_${item.branch_id}`;

            inventoryMap[key] =
                (inventoryMap[key] || 0) +
                (Number(item.quantity) || 0);
        }

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

        return jsonError(
            "Unable to load sub-products.",
            500
        );
    }
}

// --------------------------------------------------
// POST: CREATE SUB-PRODUCT AND ADD INITIAL STOCK
// --------------------------------------------------

export async function POST(request) {
    if (!(await isOwnerAuthenticated())) {
        return jsonError(
            "Unauthorized. Owner login required.",
            401
        );
    }

    let createdSubProductId = null;

    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const {
            productId,
            name,
            imageUrl,
            branchId,
            allBranches,
            quantity,
        } = body;

        const cleanName =
            typeof name === "string" ? name.trim() : "";

        if (!isValidUUID(productId)) {
            return jsonError("Valid parent product is required.");
        }

        if (!cleanName || cleanName.length > 150) {
            return jsonError(
                "Sub-product name must contain 1–150 characters."
            );
        }

        if (!isValidQuantity(quantity)) {
            return jsonError(
                "Quantity must be a non-negative whole number."
            );
        }

        if (
            typeof allBranches !== "boolean" ||
            (!allBranches && !isValidUUID(branchId))
        ) {
            return jsonError("Please select a valid branch.");
        }

        if (
            imageUrl !== undefined &&
            imageUrl !== null &&
            typeof imageUrl !== "string"
        ) {
            return jsonError("Invalid image URL.");
        }

        // Validate active parent product.

        const { data: product, error: productError } =
            await supabase
                .from("products")
                .select("id, name")
                .eq("id", productId)
                .eq("is_active", true)
                .maybeSingle();

        if (productError) throw productError;

        if (!product) {
            return jsonError("Parent product is not active.");
        }

        // Get target branches.

        let targetBranches = [];

        if (allBranches) {
            const { data, error } = await supabase
                .from("branches")
                .select("id, name")
                .eq("is_active", true);

            if (error) throw error;

            targetBranches = data || [];

        } else {
            const { data, error } = await supabase
                .from("branches")
                .select("id, name")
                .eq("id", branchId)
                .eq("is_active", true)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return jsonError("Selected branch is not active.");
            }

            targetBranches = [data];
        }

        if (targetBranches.length === 0) {
            return jsonError("No active branches found.");
        }

        // Find an existing sub-product with the same name.
        // Reuse it instead of creating a duplicate.

        const { data: existingSubProducts, error: searchError } =
            await supabase
                .from("sub_products")
                .select("id, name, product_id, is_active")
                .eq("product_id", productId);

        if (searchError) throw searchError;

        const existingSubProduct = (
            existingSubProducts || []
        ).find(
            (item) =>
                item.is_active &&
                item.name.toLowerCase() === cleanName.toLowerCase()
        );

        let subProduct;
        let created = false;

        if (existingSubProduct) {
            subProduct = existingSubProduct;

        } else {
            const { data, error } = await supabase
                .from("sub_products")
                .insert({
                    product_id: productId,
                    name: cleanName,
                    image_url: imageUrl || null,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;

            subProduct = data;
            created = true;
            createdSubProductId = subProduct.id;
        }

        // Add initial stock through purchase transactions.

        const completedBranches = [];

        try {
            for (const branch of targetBranches) {
                await recordPurchase(
                    supabase,
                    branch.id,
                    subProduct.id,
                    quantity
                );

                completedBranches.push(branch.name);
            }

        } catch (stockError) {
            console.error(
                "Sub-product stock initialization error:",
                stockError
            );

            return NextResponse.json(
                {
                    error:
                        "Sub-product was saved, but stock could not be added to every branch. Please check the quantities before retrying.",

                    subProduct,
                    completedBranches,
                    partialSuccess: true,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            created,
            subProduct,
            branches: completedBranches,
        });

    } catch (error) {
        console.error("Sub-products POST:", error);

        return jsonError(
            "Unable to create sub-product.",
            500
        );
    }
}

// --------------------------------------------------
// PATCH: EDIT SUB-PRODUCT DETAILS OR BRANCH STOCK
// --------------------------------------------------

export async function PATCH(request) {
    if (!(await isOwnerAuthenticated())) {
        return jsonError(
            "Unauthorized. Owner login required.",
            401
        );
    }

    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const {
            action,
            subProductId,
            branchId,
            quantity,
            name,
            imageUrl,
            isActive,
        } = body;

        if (!isValidUUID(subProductId)) {
            return jsonError("Valid sub-product ID is required.");
        }

        // Validate active sub-product.

        const { data: subProduct, error: subProductError } =
            await supabase
                .from("sub_products")
                .select("id, product_id, name, is_active")
                .eq("id", subProductId)
                .maybeSingle();

        if (subProductError) throw subProductError;

        if (!subProduct) {
            return jsonError("Sub-product not found.", 404);
        }

        // UPDATE BRANCH STOCK

        if (action === "stock") {
            if (!isValidUUID(branchId)) {
                return jsonError("Valid branch ID is required.");
            }

            if (!isValidQuantity(quantity)) {
                return jsonError(
                    "Quantity must be a non-negative whole number."
                );
            }

            if (!subProduct.is_active) {
                return jsonError("Sub-product is inactive.");
            }

            const { data: branch, error: branchError } =
                await supabase
                    .from("branches")
                    .select("id")
                    .eq("id", branchId)
                    .eq("is_active", true)
                    .maybeSingle();

            if (branchError) throw branchError;

            if (!branch) {
                return jsonError("Branch not found or inactive.", 404);
            }

            const { data: inventoryRows, error: inventoryError } =
                await supabase
                    .from("sub_product_inventory")
                    .select("quantity")
                    .eq("sub_product_id", subProductId)
                    .eq("branch_id", branchId);

            if (inventoryError) throw inventoryError;

            const currentQuantity = (inventoryRows || []).reduce(
                (total, item) => total + (Number(item.quantity) || 0),
                0
            );

            const difference = quantity - currentQuantity;

            if (difference > 0) {
                await recordPurchase(
                    supabase,
                    branchId,
                    subProductId,
                    difference
                );

            } else if (difference < 0) {
                await recordSale(
                    supabase,
                    branchId,
                    subProductId,
                    Math.abs(difference)
                );
            }

            return NextResponse.json({
                success: true,
                previousQuantity: currentQuantity,
                quantity,
            });
        }

        // UPDATE SUB-PRODUCT DETAILS

        if (action === "details") {
            const updateData = {};

            if (typeof name === "string") {
                const cleanName = name.trim();

                if (!cleanName || cleanName.length > 150) {
                    return jsonError(
                        "Sub-product name must contain 1–150 characters."
                    );
                }

                const { data: siblings, error } = await supabase
                    .from("sub_products")
                    .select("id, name")
                    .eq("product_id", subProduct.product_id)
                    .neq("id", subProductId);

                if (error) throw error;

                const duplicate = (siblings || []).some(
                    (item) =>
                        item.name.toLowerCase() === cleanName.toLowerCase()
                );

                if (duplicate) {
                    return jsonError(
                        "A sub-product with this name already exists."
                    );
                }

                updateData.name = cleanName;
            }

            if (imageUrl !== undefined) {
                if (
                    imageUrl !== null &&
                    typeof imageUrl !== "string"
                ) {
                    return jsonError("Invalid image URL.");
                }

                updateData.image_url = imageUrl || null;
            }

            if (isActive !== undefined) {
                if (typeof isActive !== "boolean") {
                    return jsonError("Invalid active status.");
                }

                updateData.is_active = isActive;
            }

            if (Object.keys(updateData).length === 0) {
                return jsonError("Nothing to update.");
            }

            const { data, error } = await supabase
                .from("sub_products")
                .update(updateData)
                .eq("id", subProductId)
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                subProduct: data,
            });
        }

        return jsonError("Invalid update action.");

    } catch (error) {
        console.error("Sub-products PATCH:", error);

        return jsonError(
            error.message || "Unable to update sub-product.",
            500
        );
    }
}
