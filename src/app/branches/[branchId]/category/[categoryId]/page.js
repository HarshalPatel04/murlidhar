import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBrandImage } from "@/lib/images";

export default async function CategoryPage({ params }) {
    const { branchId, categoryId } = await params;

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

    if (branchError) {
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
                            Unable to load branch
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {branchError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // LOAD CATEGORY
    // -----------------------------------------

    const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .eq("is_active", true)
        .single();

    if (categoryError) {
        return (
            <main className="min-h-screen bg-neutral-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href={`/branches/${branchId}`}
                        className="text-sm text-neutral-500"
                    >
                        ← {branch.name}
                    </Link>

                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
                        <p className="font-medium text-red-800">
                            Unable to load category
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {categoryError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // -----------------------------------------
    // LOAD BRANDS
    // -----------------------------------------

    const { data: brands, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("name");

    if (brandsError) {
        return (
            <main className="min-h-screen bg-neutral-50 p-8">
                <div className="mx-auto max-w-7xl">
                    <Link
                        href={`/branches/${branchId}`}
                        className="text-sm text-neutral-500"
                    >
                        ← {branch.name}
                    </Link>

                    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
                        <p className="font-medium text-red-800">
                            Unable to load brands
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {brandsError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

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

                <div className="flex items-center gap-2 text-sm">
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

                    <span className="text-neutral-700">
                        {category.name}
                    </span>
                </div>

                {/* TITLE */}

                <div className="mt-8">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        Category
                    </p>

                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                        {category.name}
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Select a brand to view their products.
                    </p>
                </div>

                {/* BRANDS */}

                <div className="mt-8">
                    {brands.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                            <p className="text-sm text-neutral-500">
                                No brands added yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {brands.map((brand) => (
                                <Link
                                    key={brand.id}
                                    href={`/branches/${branchId}/category/${categoryId}/brand/${brand.id}`}
                                    className="group overflow-hidden rounded-xl border border-neutral-200 bg-white hover:border-neutral-400"
                                >
                                    <div className="flex aspect-square items-center justify-center bg-white p-8">
                                        <img
                                            src={getBrandImage(brand)}
                                            alt={brand.name}
                                            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                                        />
                                    </div>

                                    <div className="p-4">
                                        <h2 className="font-medium text-neutral-900">
                                            {brand.name}
                                        </h2>

                                        <p className="mt-1 text-xs text-neutral-500">
                                            View products →
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}