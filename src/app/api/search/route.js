
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const query = searchParams.get("q")?.trim() || "";
        const branchId = searchParams.get("branchId") || null;
        const categoryId = searchParams.get("categoryId") || null;

        if (!query) {
            return NextResponse.json({ products: [] });
        }

        if (query.length > 100) {
            return NextResponse.json(
                { error: "Search query is too long." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // -----------------------------------------
        // SEARCH PRODUCTS
        // -----------------------------------------

        let productQuery = supabase
            .from("products")
            .select(`
                id,
                name,
                image_url,
                category_id,
                brand_id,
                categories (
                    id,
                    name,
                    image_url
                ),
                brands (
                    id,
                    name,
                    image_url
                )
            `)
            .eq("is_active", true)
            .ilike("name", `%${query}%`)
            .order("name")
            .limit(100);

        if (categoryId) {
            productQuery = productQuery.eq("category_id", categoryId);
        }

        const { data: products, error: productError } =
            await productQuery;

        if (productError) {
            console.error("Search product error:", productError);
            return NextResponse.json(
                { error: productError.message },
                { status: 500 }
            );
        }

        if (!products?.length) {
            return NextResponse.json({ products: [] });
        }

        const productIds = products.map((product) => product.id);

        // -----------------------------------------
        // LOAD ACTIVE SUB-PRODUCTS
        // -----------------------------------------

        const { data: subProducts, error: subProductError } =
            await supabase
                .from("sub_products")
                .select("id, product_id")
                .in("product_id", productIds)
                .eq("is_active", true);

        if (subProductError) {
            console.error("Search sub-products error:", subProductError);
            return NextResponse.json(
                { error: subProductError.message },
                { status: 500 }
            );
        }

        const subProductIds = (subProducts || []).map((item) => item.id);

        // -----------------------------------------
        // LOAD PARENT PRODUCT INVENTORY
        // -----------------------------------------

        let inventoryQuery = supabase
            .from("inventory")
            .select(`
                product_id,
                branch_id,
                quantity,
                branches (
                    id,
                    name
                )
            `)
            .in("product_id", productIds);

        if (branchId) {
            inventoryQuery = inventoryQuery.eq("branch_id", branchId);
        }

        const { data: inventory, error: inventoryError } =
            await inventoryQuery;

        if (inventoryError) {
            console.error("Search inventory error:", inventoryError);
            return NextResponse.json(
                { error: inventoryError.message },
                { status: 500 }
            );
        }

        // -----------------------------------------
        // LOAD SUB-PRODUCT INVENTORY
        // -----------------------------------------

        let subInventory = [];

        if (subProductIds.length > 0) {
            let subInventoryQuery = supabase
                .from("sub_product_inventory")
                .select(`
                    sub_product_id,
                    branch_id,
                    quantity,
                    branches (
                        id,
                        name
                    )
                `)
                .in("sub_product_id", subProductIds);

            if (branchId) {
                subInventoryQuery = subInventoryQuery.eq(
                    "branch_id",
                    branchId
                );
            }

            const { data, error } = await subInventoryQuery;

            if (error) {
                console.error("Search sub-product inventory error:", error);
                return NextResponse.json(
                    { error: error.message },
                    { status: 500 }
                );
            }

            subInventory = data || [];
        }

        // -----------------------------------------
        // MAP ACTIVE SUB-PRODUCTS TO PARENT PRODUCTS
        // -----------------------------------------

        const subProductsByParent = new Map();

        for (const item of subProducts || []) {
            if (!subProductsByParent.has(item.product_id)) {
                subProductsByParent.set(item.product_id, []);
            }

            subProductsByParent.get(item.product_id).push(item.id);
        }

        // -----------------------------------------
        // BUILD STOCK MAP
        // Sum duplicate inventory rows safely
        // -----------------------------------------

        const stockMaps = new Map();

        function addStock(productId, branch, quantity) {
            if (!stockMaps.has(productId)) {
                stockMaps.set(productId, new Map());
            }

            const branchMap = stockMaps.get(productId);
            const current = branchMap.get(branch.id);

            if (current) {
                current.quantity += Number(quantity) || 0;
            } else {
                branchMap.set(branch.id, {
                    branchId: branch.id,
                    branchName: branch.name || "Unknown Branch",
                    quantity: Number(quantity) || 0,
                });
            }
        }

        // Parent inventory is used only when the product
        // does not have any active sub-products.

        for (const item of inventory || []) {
            const hasActiveSubProducts =
                subProductsByParent.has(item.product_id);

            if (hasActiveSubProducts) continue;

            if (!item.branches) continue;

            addStock(
                item.product_id,
                {
                    id: item.branch_id,
                    name: item.branches.name,
                },
                item.quantity
            );
        }

        // For products with active sub-products,
        // calculate stock from their sub-product inventory.

        const subProductToParent = new Map();

        for (const item of subProducts || []) {
            subProductToParent.set(item.id, item.product_id);
        }

        for (const item of subInventory || []) {
            const parentProductId =
                subProductToParent.get(item.sub_product_id);

            if (!parentProductId || !item.branches) continue;

            addStock(
                parentProductId,
                {
                    id: item.branch_id,
                    name: item.branches.name,
                },
                item.quantity
            );
        }

        // -----------------------------------------
        // FORMAT RESULTS
        // -----------------------------------------

        const results = products.map((product) => {
            const branchMap = stockMaps.get(product.id);

            return {
                id: product.id,
                name: product.name,
                imageUrl: product.image_url,

                category: product.categories
                    ? {
                        id: product.categories.id,
                        name: product.categories.name,
                        imageUrl: product.categories.image_url,
                    }
                    : null,

                brand: product.brands
                    ? {
                        id: product.brands.id,
                        name: product.brands.name,
                        imageUrl: product.brands.image_url,
                    }
                    : null,

                inventory: branchMap
                    ? Array.from(branchMap.values())
                    : [],
            };
        });

        return NextResponse.json({ products: results });
    } catch (error) {
        console.error("Search API error:", error);

        return NextResponse.json(
            { error: "Unable to perform search." },
            { status: 500 }
        );
    }
}
