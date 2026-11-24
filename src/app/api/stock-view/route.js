
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
    try {
        const supabase = createAdminClient();

        const [
            productsResult,
            categoriesResult,
            brandsResult,
            branchesResult,
            subProductsResult,
        ] = await Promise.all([
            supabase
                .from("products")
                .select("id, name, category_id, brand_id")
                .eq("is_active", true)
                .order("name"),

            supabase
                .from("categories")
                .select("id, name"),

            supabase
                .from("brands")
                .select("id, name"),

            supabase
                .from("branches")
                .select("id, name")
                .eq("is_active", true)
                .order("name"),

            supabase
                .from("sub_products")
                .select("id, product_id, name, purchase_price")
                .eq("is_active", true)
                .order("name"),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;
        if (brandsResult.error) throw brandsResult.error;
        if (branchesResult.error) throw branchesResult.error;
        if (subProductsResult.error) throw subProductsResult.error;

        const products = productsResult.data || [];
        const categories = categoriesResult.data || [];
        const brands = brandsResult.data || [];
        const branches = branchesResult.data || [];
        const subProducts = subProductsResult.data || [];

        // Fetch inventory for all active sub-products
        const subProductIds = subProducts.map((item) => item.id);

        let inventory = [];

        if (subProductIds.length > 0) {
            const { data, error } = await supabase
                .from("sub_product_inventory")
                .select("branch_id, sub_product_id, quantity")
                .in("sub_product_id", subProductIds);

            if (error) throw error;

            inventory = data || [];
        }

        // Lookup maps
        const categoryMap = Object.fromEntries(
            categories.map((item) => [item.id, item.name])
        );

        const brandMap = Object.fromEntries(
            brands.map((item) => [item.id, item.name])
        );

        const inventoryMap = {};

        for (const item of inventory) {
            const key = `${item.sub_product_id}_${item.branch_id}`;

            inventoryMap[key] =
                (inventoryMap[key] || 0) +
                (Number(item.quantity) || 0);
        }

        // Group sub-products under their main products
        const productMap = new Map();

        for (const product of products) {
            productMap.set(product.id, {
                id: product.id,
                productName: product.name,

                categoryName:
                    categoryMap[product.category_id] || "Uncategorized",

                brandName:
                    brandMap[product.brand_id] || "Unbranded",

                subProducts: [],
                totalStock: 0,
                branches: branches.map((branch) => ({
                    id: branch.id,
                    name: branch.name,
                    quantity: 0,
                })),
            });
        }

        // Add every sub-product to its parent product
        for (const item of subProducts) {
            const product = productMap.get(item.product_id);

            if (!product) continue;

            const subProductBranches = branches.map((branch) => ({
                id: branch.id,
                name: branch.name,
                quantity:
                    inventoryMap[`${item.id}_${branch.id}`] ?? 0,
            }));

            const subProductTotalStock =
                subProductBranches.reduce(
                    (total, branch) => total + branch.quantity,
                    0
                );

            const subProduct = {
                id: item.id,
                name: item.name,

                purchasePrice:
                    Number(item.purchase_price) || 0,

                totalStock: subProductTotalStock,

                branches: subProductBranches,
            };

            product.subProducts.push(subProduct);

            // Add sub-product stock to parent product total
            product.totalStock += subProductTotalStock;

            // Add stock branch-wise to parent product
            subProductBranches.forEach((branch) => {
                const parentBranch = product.branches.find(
                    (entry) => entry.id === branch.id
                );

                if (parentBranch) {
                    parentBranch.quantity += branch.quantity;
                }
            });
        }

        const data = Array.from(productMap.values());

        return NextResponse.json({
            success: true,
            data,
        });

    } catch (error) {
        console.error("Stock View GET:", error);

        return NextResponse.json(
            { error: "Unable to load stock view." },
            { status: 500 }
        );
    }
}
