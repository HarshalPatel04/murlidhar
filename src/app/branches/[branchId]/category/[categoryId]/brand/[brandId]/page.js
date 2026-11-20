
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/inventory/ProductCard";
import ProductSearch from "./ProductSearch";

export default async function BrandPage({ params }) {
    const {
        branchId,
        categoryId,
        brandId,
    } = await params;

    const supabase = await createClient();

    // -----------------------------------------
    // LOAD BRANCH
    // -----------------------------------------

    const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .eq("is_active", true)
        .single();

    // -----------------------------------------
    // LOAD CATEGORY
    // -----------------------------------------

    const { data: category, error: categoryError } =
        await supabase
            .from("categories")
            .select("*")
            .eq("id", categoryId)
            .eq("is_active", true)
            .single();

    // -----------------------------------------
    // LOAD BRAND
    // -----------------------------------------

    const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .eq("is_active", true)
        .single();

    if (branchError || categoryError || brandError) {
        const error =
            branchError ||
            categoryError ||
            brandError;

        return (
            <main className="min-h-screen bg-neutral-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href="/"
                        className="text-sm text-neutral-500"
                    >
                        ← All Branches
                    </Link>

                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
                        <p className="font-medium text-red-800">
                            Unable to load page
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {error?.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // LOAD PRODUCTS
    // -----------------------------------------

    const { data: products, error: productsError } =
        await supabase
            .from("products")
            .select("*")
            .eq("category_id", categoryId)
            .eq("brand_id", brandId)
            .eq("is_active", true)
            .order("name");

    if (productsError) {
        return (
            <main className="min-h-screen bg-neutral-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                        <p className="font-medium text-red-800">
                            Unable to load products
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {productsError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }


    // -----------------------------------------
    // LOAD PARENT AND SUB-PRODUCT STOCK
    // -----------------------------------------

    const productIds = (products || []).map(
        (product) => product.id
    );

    const quantityMap = {};

    if (productIds.length > 0) {
        // Load normal parent inventory
        const { data: inventory, error: inventoryError } =
            await supabase
                .from("inventory")
                .select("product_id, quantity")
                .eq("branch_id", branchId)
                .in("product_id", productIds);

        if (inventoryError) {
            throw new Error(inventoryError.message);
        }

        // Initialize normal parent quantities
        (inventory || []).forEach((item) => {
            quantityMap[item.product_id] =
                (quantityMap[item.product_id] || 0) +
                (Number(item.quantity) || 0);
        });

        // Load active sub-products
        const { data: activeSubProducts, error: subProductsError } =
            await supabase
                .from("sub_products")
                .select("id, product_id")
                .in("product_id", productIds)
                .eq("is_active", true);

        if (subProductsError) {
            throw new Error(subProductsError.message);
        }

        const subProductIds = (activeSubProducts || []).map(
            (item) => item.id
        );

        // Calculate parent stock from active sub-products
        if (subProductIds.length > 0) {
            const { data: subInventory, error: subInventoryError } =
                await supabase
                    .from("sub_product_inventory")
                    .select("sub_product_id, quantity")
                    .eq("branch_id", branchId)
                    .in("sub_product_id", subProductIds);

            if (subInventoryError) {
                throw new Error(subInventoryError.message);
            }

            const subProductQuantityMap = {};

            (subInventory || []).forEach((item) => {
                subProductQuantityMap[item.sub_product_id] =
                    (subProductQuantityMap[item.sub_product_id] || 0) +
                    (Number(item.quantity) || 0);
            });

            const parentStockMap = {};

            (activeSubProducts || []).forEach((subProduct) => {
                const parentId = subProduct.product_id;

                parentStockMap[parentId] =
                    (parentStockMap[parentId] || 0) +
                    (subProductQuantityMap[subProduct.id] || 0);
            });

            // Override parent quantity wherever active sub-products exist
            Object.entries(parentStockMap).forEach(
                ([parentId, totalStock]) => {
                    quantityMap[parentId] = totalStock;
                }
            );
        }
    }

    // -----------------------------------------
    // LOAD ACTIVE SUB-PRODUCTS
    // -----------------------------------------

    if (productIds.length > 0) {
        const {
            data: activeSubProducts,
            error: subProductsError,
        } = await supabase
            .from("sub_products")
            .select("id, product_id")
            .in("product_id", productIds)
            .eq("is_active", true);

        if (subProductsError) {
            return (
                <main className="min-h-screen bg-neutral-50 p-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                            <p className="font-medium text-red-800">
                                Unable to load sub-products
                            </p>

                            <p className="mt-2 text-sm text-red-700">
                                {subProductsError.message}
                            </p>
                        </div>
                    </div>
                </main>
            );
        }

        // -----------------------------------------
        // LOAD SUB-PRODUCT INVENTORY
        // -----------------------------------------

        const subProductIds = (activeSubProducts || []).map(
            (item) => item.id
        );

        if (subProductIds.length > 0) {
            const {
                data: subInventory,
                error: subInventoryError,
            } = await supabase
                .from("sub_product_inventory")
                .select("sub_product_id, quantity")
                .eq("branch_id", branchId)
                .in("sub_product_id", subProductIds);

            if (subInventoryError) {
                return (
                    <main className="min-h-screen bg-neutral-50 p-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                                <p className="font-medium text-red-800">
                                    Unable to load sub-product inventory
                                </p>

                                <p className="mt-2 text-sm text-red-700">
                                    {subInventoryError.message}
                                </p>
                            </div>
                        </div>
                    </main>
                );
            }

            // -----------------------------------------
            // CALCULATE PARENT STOCK
            // -----------------------------------------

            const subProductQuantityMap = {};

            (subInventory || []).forEach((item) => {
                subProductQuantityMap[item.sub_product_id] =
                    Number(item.quantity) || 0;
            });

            const parentStockMap = {};

            (activeSubProducts || []).forEach((subProduct) => {
                const parentId = subProduct.product_id;

                if (parentStockMap[parentId] === undefined) {
                    parentStockMap[parentId] = 0;
                }

                parentStockMap[parentId] +=
                    subProductQuantityMap[subProduct.id] || 0;
            });

            // -----------------------------------------
            // OVERRIDE PARENT STOCK
            // -----------------------------------------

            Object.entries(parentStockMap).forEach(
                ([parentId, totalStock]) => {
                    quantityMap[parentId] = totalStock;
                }
            );
        }
    }

    // -----------------------------------------
    // PAGE
    // -----------------------------------------

    return (
        <main className="min-h-screen bg-neutral-50">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link
                        href="/"
                        className="text-lg font-semibold tracking-tight text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    <Link
                        href="/inventory/add"
                        className="flex gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                    >
                        <span className="text-xl leading-none">
                            +
                        </span>

                        <span>Add Inventory</span>
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-6">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                        href="/"
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        Branches
                    </Link>

                    <span className="text-neutral-300">/</span>

                    <Link
                        href={`/branches/${branchId}`}
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        {branch.name}
                    </Link>

                    <span className="text-neutral-300">/</span>

                    <Link
                        href={`/branches/${branchId}/category/${categoryId}`}
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        {category.name}
                    </Link>

                    <span className="text-neutral-300">/</span>

                    <span className="text-neutral-700">
                        {brand.name}
                    </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {category.name}
                    </p>

                    <div>
                        <h1 className="text-end text-3xl font-semibold tracking-tight text-neutral-900">
                            {brand.name}
                        </h1>

                        <p className="mt-2 hidden text-sm text-neutral-500 md:block">
                            Products available at {branch.name}.
                        </p>
                    </div>
                </div>

                <div className="mt-4">
                    {products.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                            <p className="text-sm text-neutral-500">
                                No products added yet.
                            </p>
                        </div>
                    ) : (
                        <ProductSearch
                            products={products}
                            quantityMap={quantityMap}
                            branchId={branchId}
                            categoryName={category.name}
                        />
                    )}
                </div>
            </section>
        </main>
    );
}
