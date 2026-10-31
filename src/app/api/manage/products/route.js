
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

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

async function recordPurchase(
    supabase,
    branchId,
    productId,
    quantity
) {
    if (quantity <= 0) return;

    const { error } = await supabase.rpc(
        "record_inventory_transaction",
        {
            p_branch_id: branchId,
            p_product_id: productId,
            p_type: "purchase",
            p_quantity: quantity,
            p_transaction_at: new Date().toISOString(),
        }
    );

    if (error) throw error;
}

async function recordSale(
    supabase,
    branchId,
    productId,
    quantity
) {
    if (quantity <= 0) return;

    const { error } = await supabase.rpc(
        "record_inventory_transaction",
        {
            p_branch_id: branchId,
            p_product_id: productId,
            p_type: "sale",
            p_quantity: quantity,
            p_transaction_at: new Date().toISOString(),
        }
    );

    if (error) throw error;
}

// --------------------------------------------------
// GET: LOAD PRODUCTS WITH BRANCH-WISE STOCK
// --------------------------------------------------

export async function GET() {
    if (!(await isOwnerAuthenticated())) {
        return jsonError("Unauthorized. Owner login required.", 401);
    }

    try {
        const supabase = createAdminClient();

        const [
            productsResult,
            branchesResult,
            inventoryResult,
        ] = await Promise.all([
            supabase
                .from("products")
                .select(`
                    id,
                    name,
                    category_id,
                    brand_id,
                    image_url,
                    is_active,
                    categories:category_id (
                        id,
                        name
                    ),
                    brands:brand_id (
                        id,
                        name
                    )
                `)
                .order("name"),

            supabase
                .from("branches")
                .select("id, name, is_active")
                .order("name"),

            supabase
                .from("inventory")
                .select("branch_id, product_id, quantity"),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (branchesResult.error) throw branchesResult.error;
        if (inventoryResult.error) throw inventoryResult.error;

        const inventoryMap = {};

        for (const item of inventoryResult.data || []) {
            inventoryMap[
                `${item.product_id}_${item.branch_id}`
            ] = item.quantity;
        }

        const products = (productsResult.data || []).map(
            (product) => ({
                ...product,
                category_name: product.categories?.name || "",
                brand_name: product.brands?.name || "",
                branches: (branchesResult.data || []).map(
                    (branch) => ({
                        id: branch.id,
                        name: branch.name,
                        is_active: branch.is_active,
                        quantity:
                            inventoryMap[
                            `${product.id}_${branch.id}`
                            ] ?? 0,
                    })
                ),
            })
        );

        return NextResponse.json({
            data: products,
            branches: branchesResult.data || [],
        });
    } catch (error) {
        console.error("Manage products GET:", error);

        return jsonError(
            "Unable to load products.",
            500
        );
    }
}

// --------------------------------------------------
// POST: CREATE PRODUCT AND ADD INITIAL STOCK
// --------------------------------------------------

export async function POST(request) {
    if (!(await isOwnerAuthenticated())) {
        return jsonError("Unauthorized. Owner login required.", 401);
    }

    let createdProductId = null;

    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const {
            name,
            categoryId,
            brandId,
            branchId,
            allBranches,
            quantity,
        } = body;

        const cleanName =
            typeof name === "string" ? name.trim() : "";

        if (!cleanName || cleanName.length > 150) {
            return jsonError(
                "Product name must contain 1–150 characters."
            );
        }

        if (!isValidUUID(categoryId)) {
            return jsonError("Please select a valid category.");
        }

        if (
            brandId !== null &&
            brandId !== undefined &&
            brandId !== "" &&
            !isValidUUID(brandId)
        ) {
            return jsonError("Please select a valid brand.");
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

        // Validate active category.

        const { data: category, error: categoryError } =
            await supabase
                .from("categories")
                .select("id")
                .eq("id", categoryId)
                .eq("is_active", true)
                .maybeSingle();

        if (categoryError) throw categoryError;

        if (!category) {
            return jsonError("Selected category is not active.");
        }

        // Validate active brand, if supplied.

        let cleanBrandId = null;

        if (brandId) {
            const { data: brand, error: brandError } =
                await supabase
                    .from("brands")
                    .select("id")
                    .eq("id", brandId)
                    .eq("is_active", true)
                    .maybeSingle();

            if (brandError) throw brandError;

            if (!brand) {
                return jsonError("Selected brand is not active.");
            }

            cleanBrandId = brandId;
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

        // Find existing product by exact name/category/brand.

        const { data: existingProducts, error: searchError } =
            await supabase
                .from("products")
                .select("id, name, category_id, brand_id")
                .eq("category_id", categoryId)
                .eq("name", cleanName);

        if (searchError) throw searchError;

        const existingProduct = (existingProducts || []).find(
            (product) =>
                (product.brand_id || null) === cleanBrandId
        );

        let product;
        let created = false;

        if (existingProduct) {
            product = existingProduct;
        } else {
            const { data, error } = await supabase
                .from("products")
                .insert({
                    name: cleanName,
                    category_id: categoryId,
                    brand_id: cleanBrandId,
                    image_url: null,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;

            product = data;
            created = true;
            createdProductId = product.id;
        }

        // Record initial stock using existing transaction RPC.

        const completedBranches = [];

        try {
            for (const branch of targetBranches) {
                await recordPurchase(
                    supabase,
                    branch.id,
                    product.id,
                    quantity
                );

                completedBranches.push(branch.name);
            }
        } catch (stockError) {
            console.error(
                "Product stock initialization error:",
                stockError
            );

            return NextResponse.json(
                {
                    error:
                        "Product was saved, but stock could not be added to every branch. Please check the product quantities before retrying.",
                    product,
                    completedBranches,
                    partialSuccess: true,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            created,
            product,
            branches: completedBranches,
        });
    } catch (error) {
        console.error("Manage products POST:", error);

        return jsonError(
            "Unable to create product.",
            500
        );
    }
}

// --------------------------------------------------
// PATCH: EDIT PRODUCT DETAILS OR BRANCH STOCK
// --------------------------------------------------

export async function PATCH(request) {
    if (!(await isOwnerAuthenticated())) {
        return jsonError("Unauthorized. Owner login required.", 401);
    }

    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const {
            action,
            productId,
            branchId,
            quantity,
            name,
            categoryId,
            brandId,
        } = body;

        if (!isValidUUID(productId)) {
            return jsonError("Valid product ID is required.");
        }

        // Update branch stock.

        if (action === "stock") {
            if (!isValidUUID(branchId)) {
                return jsonError("Valid branch ID is required.");
            }

            if (!isValidQuantity(quantity)) {
                return jsonError(
                    "Quantity must be a non-negative whole number."
                );
            }

            const { data: product, error: productError } =
                await supabase
                    .from("products")
                    .select("id")
                    .eq("id", productId)
                    .eq("is_active", true)
                    .maybeSingle();

            if (productError) throw productError;

            if (!product) {
                return jsonError("Product not found or inactive.", 404);
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

            const { data: inventory, error: inventoryError } =
                await supabase
                    .from("inventory")
                    .select("quantity")
                    .eq("product_id", productId)
                    .eq("branch_id", branchId)
                    .maybeSingle();

            if (inventoryError) throw inventoryError;

            const currentQuantity = inventory?.quantity ?? 0;
            const difference = quantity - currentQuantity;

            if (difference > 0) {
                await recordPurchase(
                    supabase,
                    branchId,
                    productId,
                    difference
                );
            } else if (difference < 0) {
                await recordSale(
                    supabase,
                    branchId,
                    productId,
                    Math.abs(difference)
                );
            }

            return NextResponse.json({
                success: true,
                previousQuantity: currentQuantity,
                quantity,
            });
        }

        // Update product details.

        if (action === "details") {
            const updateData = {};

            if (typeof name === "string") {
                const cleanName = name.trim();

                if (!cleanName || cleanName.length > 150) {
                    return jsonError(
                        "Product name must contain 1–150 characters."
                    );
                }

                updateData.name = cleanName;
            }

            if (categoryId !== undefined) {
                if (!isValidUUID(categoryId)) {
                    return jsonError("Valid category is required.");
                }

                const { data, error } = await supabase
                    .from("categories")
                    .select("id")
                    .eq("id", categoryId)
                    .eq("is_active", true)
                    .maybeSingle();

                if (error) throw error;
                if (!data) {
                    return jsonError("Selected category is not active.");
                }

                updateData.category_id = categoryId;
            }

            if (brandId !== undefined) {
                if (
                    brandId !== null &&
                    brandId !== "" &&
                    !isValidUUID(brandId)
                ) {
                    return jsonError("Invalid brand.");
                }

                if (brandId) {
                    const { data, error } = await supabase
                        .from("brands")
                        .select("id")
                        .eq("id", brandId)
                        .eq("is_active", true)
                        .maybeSingle();

                    if (error) throw error;
                    if (!data) {
                        return jsonError("Selected brand is not active.");
                    }
                }

                updateData.brand_id = brandId || null;
            }

            if (Object.keys(updateData).length === 0) {
                return jsonError("Nothing to update.");
            }

            const { data, error } = await supabase
                .from("products")
                .update(updateData)
                .eq("id", productId)
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({
                success: true,
                product: data,
            });
        }

        return jsonError("Invalid update action.");
    } catch (error) {
        console.error("Manage products PATCH:", error);

        return jsonError(
            error.message || "Unable to update product.",
            500
        );
    }
}
