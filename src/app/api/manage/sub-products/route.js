
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

async function verifyOwner() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getOwnerCookieName())?.value;
    return await verifyOwnerSession(token);
}

function validatePrice(value, fieldName) {
    if (value === undefined || value === null || value === "") {
        return { valid: true, value: null };
    }

    const price = Number(value);

    if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isSafeInteger(Math.round(price * 100)) ||
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

export async function GET(request) {
    try {
        if (!(await verifyOwner())) {
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
                    purchase_price,
                    selling_price,
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

        const inventoryMap = {};

        for (const item of inventoryResult.data || []) {
            const key = `${item.sub_product_id}_${item.branch_id}`;

            inventoryMap[key] =
                (inventoryMap[key] || 0) +
                (Number(item.quantity) || 0);
        }

        const subProducts = (subProductsResult.data || []).map(
            (subProduct) => ({
                ...subProduct,
                purchase_price: Number(subProduct.purchase_price) || 0,
                selling_price: Number(subProduct.selling_price) || 0,

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
            })
        );

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
        if (!(await verifyOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            productId,
            name,
            imageUrl,
            branchId,
            allBranches,
            quantity,
            purchasePrice,
            sellingPrice,
        } = body;

        const cleanName =
            typeof name === "string" ? name.trim() : "";

        if (!UUID.test(productId || "")) {
            return NextResponse.json(
                { error: "Valid parent product is required." },
                { status: 400 }
            );
        }

        if (!cleanName || cleanName.length > 150) {
            return NextResponse.json(
                {
                    error:
                        "Sub-product name must contain 1–150 characters.",
                },
                { status: 400 }
            );
        }

        if (
            typeof allBranches !== "boolean" ||
            !Number.isSafeInteger(quantity) ||
            quantity < 0
        ) {
            return NextResponse.json(
                { error: "Invalid branch selection or quantity." },
                { status: 400 }
            );
        }

        if (!allBranches && !UUID.test(branchId || "")) {
            return NextResponse.json(
                { error: "Please select a valid branch." },
                { status: 400 }
            );
        }

        const purchase = validatePrice(
            purchasePrice,
            "Purchase price"
        );

        const selling = validatePrice(
            sellingPrice,
            "Selling price"
        );

        if (!purchase.valid) {
            return NextResponse.json(
                { error: purchase.error },
                { status: 400 }
            );
        }

        if (!selling.valid) {
            return NextResponse.json(
                { error: selling.error },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data: product, error: productError } = await supabase
            .from("products")
            .select("id")
            .eq("id", productId)
            .eq("is_active", true)
            .maybeSingle();

        if (productError) throw productError;

        if (!product) {
            return NextResponse.json(
                { error: "Parent product not found or inactive." },
                { status: 404 }
            );
        }

        let targetBranchesQuery = supabase
            .from("branches")
            .select("id, name")
            .eq("is_active", true);

        if (!allBranches) {
            targetBranchesQuery = targetBranchesQuery.eq("id", branchId);
        }

        const { data: targetBranches, error: branchesError } =
            await targetBranchesQuery;

        if (branchesError) throw branchesError;

        if (!targetBranches?.length) {
            return NextResponse.json(
                { error: "No active branches found." },
                { status: 400 }
            );
        }

        const { data: existingItems, error: existingError } =
            await supabase
                .from("sub_products")
                .select(`
                    id,
                    name,
                    product_id,
                    purchase_price,
                    selling_price
                `)
                .eq("product_id", productId)
                .eq("is_active", true)
                .eq("name", cleanName)
                .limit(1);

        if (existingError) throw existingError;

        let subProduct;
        let created = false;

        if (existingItems?.length) {
            const existing = existingItems[0];

            const updateData = {};

            if (purchase.value !== null) {
                updateData.purchase_price = purchase.value;
            }

            if (selling.value !== null) {
                updateData.selling_price = selling.value;
            }

            if (typeof imageUrl === "string") {
                updateData.image_url = imageUrl.trim() || null;
            }

            if (Object.keys(updateData).length > 0) {
                const { data, error } = await supabase
                    .from("sub_products")
                    .update(updateData)
                    .eq("id", existing.id)
                    .select()
                    .single();

                if (error) throw error;

                subProduct = data;
            } else {
                subProduct = existing;
            }
        } else {
            const { data, error } = await supabase
                .from("sub_products")
                .insert({
                    product_id: productId,
                    name: cleanName,
                    image_url:
                        typeof imageUrl === "string"
                            ? imageUrl.trim() || null
                            : null,
                    purchase_price: purchase.value ?? 0,
                    selling_price: selling.value ?? 0,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;

            subProduct = data;
            created = true;
        }

        const completedBranches = [];

        if (quantity > 0) {
            for (const branch of targetBranches) {
                const { error } = await supabase.rpc(
                    "record_sub_product_transaction",
                    {
                        p_branch_id: branch.id,
                        p_sub_product_id: subProduct.id,
                        p_type: "purchase",
                        p_quantity: quantity,
                        p_transaction_at: new Date().toISOString(),
                    }
                );

                if (error) {
                    console.error(
                        "Initial sub-product stock error:",
                        error
                    );

                    return NextResponse.json(
                        {
                            error:
                                "Sub-product was saved, but initial stock could not be added to every branch. Please check the quantities before retrying.",
                            subProduct,
                            completedBranches,
                            partialSuccess: true,
                        },
                        { status: 500 }
                    );
                }

                completedBranches.push(branch.name);
            }
        }

        return NextResponse.json({
            success: true,
            created,
            subProduct,
            branches: completedBranches,
        });
    } catch (error) {
        console.error("Sub-product POST:", error);

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Unable to create sub-product.",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(request) {
    try {
        if (!(await verifyOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            action,
            subProductId,
            name,
            imageUrl,
            isActive,
            purchasePrice,
            sellingPrice,
        } = body;

        if (action !== "details") {
            return NextResponse.json(
                { error: "Invalid update action." },
                { status: 400 }
            );
        }

        if (!UUID.test(subProductId || "")) {
            return NextResponse.json(
                { error: "Valid sub-product ID is required." },
                { status: 400 }
            );
        }

        const updateData = {};

        if (name !== undefined) {
            const cleanName =
                typeof name === "string" ? name.trim() : "";

            if (!cleanName || cleanName.length > 150) {
                return NextResponse.json(
                    { error: "Sub-product name must contain 1–150 characters." },
                    { status: 400 }
                );
            }

            updateData.name = cleanName;
        }

        if (imageUrl !== undefined) {
            if (imageUrl !== null && typeof imageUrl !== "string") {
                return NextResponse.json(
                    { error: "Invalid image URL." },
                    { status: 400 }
                );
            }

            updateData.image_url =
                typeof imageUrl === "string"
                    ? imageUrl.trim() || null
                    : null;
        }

        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return NextResponse.json(
                    { error: "Invalid active status." },
                    { status: 400 }
                );
            }

            updateData.is_active = isActive;
        }

        if (purchasePrice !== undefined) {
            const purchase = validatePrice(
                purchasePrice,
                "Purchase price"
            );

            if (!purchase.valid) {
                return NextResponse.json(
                    { error: purchase.error },
                    { status: 400 }
                );
            }

            updateData.purchase_price = purchase.value;
        }

        if (sellingPrice !== undefined) {
            const selling = validatePrice(
                sellingPrice,
                "Selling price"
            );

            if (!selling.valid) {
                return NextResponse.json(
                    { error: selling.error },
                    { status: 400 }
                );
            }

            updateData.selling_price = selling.value;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No changes provided." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("sub_products")
            .update(updateData)
            .eq("id", subProductId)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return NextResponse.json(
                { error: "Sub-product not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            subProduct: data,
        });
    } catch (error) {
        console.error("Sub-products PATCH:", error);

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Unable to update sub-product.",
            },
            { status: 500 }
        );
    }
}