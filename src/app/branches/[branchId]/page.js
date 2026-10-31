import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { getCategoryImage } from "@/lib/images";

export default async function BranchPage({ params }) {
    const { branchId } = await params;

    if (!branchId) {
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
                            Branch ID is missing
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            Check the terminal for RAW PARAMS.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const supabase = await createClient();

    const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .eq("is_active", true)
        .single();

    if (branchError) {
        console.error("BRANCH ERROR:", branchError);

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

    const { data: categories, error: categoryError } =
        await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("name");

    if (categoryError) {
        console.error("CATEGORY ERROR:", categoryError);

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
                            Unable to load categories
                        </p>

                        <p className="mt-2 text-sm text-red-700">
                            {categoryError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

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
                        className="rounded-lg bg-neutral-900 flex gap-2 px-4 py-2 text-sm font-medium text-white"
                    >
                        <span className="text-xl leading-none">
                            +
                        </span>

                        <span>Add Inventory</span>
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-[1408px] px-6 py-6">
                <div className="flex justify-between items-center border-b border-neutral-300 pb-2">
                    <Link
                        href="/"
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                    >
                        ← All Branches
                    </Link>

                    <h2 className="hidden md:block flex text-2xl font-semibold text-neutral-900">
                        Categories
                    </h2>

                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                            {branch.name}
                        </h1>
                    </div>

                </div>
                <div className="md:hidden pt-4">
                    <h2 className="flex text-2xl font-semibold text-neutral-900">
                        Categories
                    </h2>
                </div>

                <div className="mt-10">

                    {categories.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                            <p className="text-sm text-neutral-500">
                                No categories added yet.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-5 flex flex-wrap gap-5 justify-center">
                            {categories.map((category) => (
                                <Link
                                    key={category.id}
                                    href={`/branches/${branchId}/category/${category.id}`}
                                    className="overflow-hidden w-64 h-auto rounded-xl border border-neutral-200 bg-white hover:border-neutral-400"
                                >
                                    <div className="relative mb-3 aspect-square w-full overflow-hidden bg-white">
                                        <Image
                                            src={getCategoryImage(category)}
                                            alt={category.name}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
                                            className="object-contain p-3"
                                        />
                                    </div>

                                    <div className="p-4 border-t border-neutral-400 mx-4">
                                        <h3 className="font-medium text-neutral-900">
                                            {category.name}
                                        </h3>

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