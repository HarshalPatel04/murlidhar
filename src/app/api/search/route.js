import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
    try {
        const { searchParams } =
            new URL(request.url);

        const query =
            searchParams.get("q")?.trim() || "";

        const branchId =
            searchParams.get("branchId") || null;

        const categoryId =
            searchParams.get("categoryId") || null;

        if (!query) {
            return NextResponse.json({
                products: [],
            });
        }

        const supabase = await createClient();

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
            productQuery = productQuery.eq(
                "category_id",
                categoryId
            );
        }

        const {
            data: products,
            error: productError,
        } = await productQuery;

        if (productError) {
            console.error(
                "Search product error:",
                productError
            );

            return NextResponse.json(
                {
                    error: productError.message,
                },
                {
                    status: 500,
                }
            );
        }

        if (!products || products.length === 0) {
            return NextResponse.json({
                products: [],
            });
        }

        if (query.length > 100) {
            return NextResponse.json(
                { error: "Search query is too long." },
                { status: 400 }
            );
        }

        // -----------------------------------------
        // GET INVENTORY
        // -----------------------------------------

        const productIds = products.map(
            (product) => product.id
        );

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
            inventoryQuery = inventoryQuery.eq(
                "branch_id",
                branchId
            );
        }

        const {
            data: inventory,
            error: inventoryError,
        } = await inventoryQuery;

        if (inventoryError) {
            console.error(
                "Search inventory error:",
                inventoryError
            );

            return NextResponse.json(
                {
                    error: inventoryError.message,
                },
                {
                    status: 500,
                }
            );
        }

        // -----------------------------------------
        // BUILD INVENTORY MAP
        // -----------------------------------------

        const inventoryMap = new Map();

        for (const item of inventory || []) {
            if (!inventoryMap.has(item.product_id)) {
                inventoryMap.set(
                    item.product_id,
                    []
                );
            }

            inventoryMap
                .get(item.product_id)
                .push({
                    branchId: item.branch_id,
                    branchName:
                        item.branches?.name ||
                        "Unknown Branch",
                    quantity: item.quantity,
                });
        }

        // -----------------------------------------
        // FORMAT RESULTS
        // -----------------------------------------

        const results = products.map(
            (product) => ({
                id: product.id,
                name: product.name,
                imageUrl: product.image_url,
                category: product.categories
                    ? {
                        id:
                            product.categories.id,
                        name:
                            product.categories.name,
                        imageUrl:
                            product.categories
                                .image_url,
                    }
                    : null,
                brand: product.brands
                    ? {
                        id: product.brands.id,
                        name:
                            product.brands.name,
                        imageUrl:
                            product.brands
                                .image_url,
                    }
                    : null,
                inventory:
                    inventoryMap.get(product.id) ||
                    [],
            })
        );

        return NextResponse.json({
            products: results,
        });
    } catch (error) {
        console.error(
            "Search API error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Unable to perform search.",
            },
            {
                status: 500,
            }
        );
    }
}