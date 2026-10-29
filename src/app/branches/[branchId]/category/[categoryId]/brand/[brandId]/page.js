import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/inventory/ProductCard";

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
    // LOAD INVENTORY
    // -----------------------------------------

    const productIds = products.map(
        (product) => product.id
    );

    let inventory = [];

    if (productIds.length > 0) {
        const { data: inventoryData, error: inventoryError } =
            await supabase
                .from("inventory")
                .select("*")
                .eq("branch_id", branchId)
                .in("product_id", productIds);

        if (inventoryError) {
            return (
                <main className="min-h-screen bg-neutral-50 p-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                            <p className="font-medium text-red-800">
                                Unable to load inventory
                            </p>

                            <p className="mt-2 text-sm text-red-700">
                                {inventoryError.message}
                            </p>
                        </div>
                    </div>
                </main>
            );
        }

        inventory = inventoryData || [];
    }

    // Convert inventory array into quick lookup
    const quantityMap = new Map(
        inventory.map((item) => [
            item.product_id,
            item.quantity,
        ])
    );

    return (
        <main className="min-h-screen bg-neutral-50">
            {/* HEADER */}

            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <Link
                        href="/"
                        className="text-lg font-semibold tracking-tight text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                        + Add Inventory
                    </button>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-6 py-8">
                {/* BREADCRUMB */}

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                        href="/"
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        Branches
                    </Link>

                    <span className="text-neutral-300">
                        /
                    </span>

                    <Link
                        href={`/branches/${branchId}`}
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        {branch.name}
                    </Link>

                    <span className="text-neutral-300">
                        /
                    </span>

                    <Link
                        href={`/branches/${branchId}/category/${categoryId}`}
                        className="text-neutral-400 hover:text-neutral-900"
                    >
                        {category.name}
                    </Link>

                    <span className="text-neutral-300">
                        /
                    </span>

                    <span className="text-neutral-700">
                        {brand.name}
                    </span>
                </div>

                {/* TITLE */}

                <div className="mt-8">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        {category.name}
                    </p>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                        {brand.name}
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Products available at {branch.name}.
                    </p>
                </div>

                {/* PRODUCTS */}

                <div className="mt-8">
                    {products.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                            <p className="text-sm text-neutral-500">
                                No products added yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {products.map((product) => {
                                const quantity =
                                    quantityMap.get(product.id) ?? 0;

                                return (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        quantity={quantity}
                                        branchId={branchId}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
