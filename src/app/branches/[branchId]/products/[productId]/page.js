
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProductSubProductsPage() {
    const { branchId, productId } = useParams();

    const [product, setProduct] = useState(null);
    const [subProducts, setSubProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadSubProducts() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/manage/sub-products?productId=${productId}`,
                    { cache: "no-store" }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Failed to load sub-products."
                    );
                }

                setProduct(result.product || null);

                setSubProducts(
                    (result.data || []).filter(
                        (item) => item.is_active
                    )
                );

                setBranches(
                    (result.branches || []).filter(
                        (branch) => branch.is_active
                    )
                );
            } catch (err) {
                console.error(err);
                setError(err.message || "Something went wrong.");
            } finally {
                setLoading(false);
            }
        }

        if (productId) {
            loadSubProducts();
        }
    }, [productId]);

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f8f8f7] p-6">
                <p className="text-sm text-neutral-500">
                    Loading sub-products...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#f8f8f7] p-6">
                <p className="text-sm text-red-600">{error}</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f8f8f7] px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-7xl">

                <Link
                    href={`/branches/${branchId}`}
                    className="mb-6 inline-flex text-sm text-neutral-500 hover:text-black"
                >
                    ← Back to Inventory
                </Link>

                <header className="mb-8">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
                        Product Inventory
                    </p>

                    <h1 className="text-2xl font-semibold text-neutral-900">
                        {product?.name || "Product"}
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        {subProducts.length} sub-products
                    </p>
                </header>

                {subProducts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                        <p className="font-medium text-neutral-700">
                            No sub-products found
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                            This product doesn't have any active sub-products yet.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {subProducts.map((item) => {
                            const selectedBranch = item.branches?.find(
                                (branch) => String(branch.id) === String(branchId)
                            );

                            return (
                                <div
                                    key={item.id}
                                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
                                >
                                    <div className="aspect-[4/3] bg-neutral-100">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                                                No Image
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        <h2 className="font-medium text-neutral-900">
                                            {item.name}
                                        </h2>

                                        <p className="mt-2 text-sm text-neutral-500">
                                            {selectedBranch?.name || "Selected branch"} Stock
                                        </p>

                                        <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
                                            {selectedBranch?.quantity ?? 0}
                                        </p>

                                        <div className="mt-4 border-t border-neutral-100 pt-3">
                                            <p className="mb-2 text-xs font-medium text-neutral-400">
                                                All Branches
                                            </p>

                                            <div className="space-y-2">
                                                {branches.map((branch) => {
                                                    const stock = item.branches?.find(
                                                        (entry) => entry.id === branch.id
                                                    );

                                                    return (
                                                        <div
                                                            key={branch.id}
                                                            className="flex justify-between text-xs"
                                                        >
                                                            <span className="text-neutral-500">
                                                                {branch.name}
                                                            </span>

                                                            <span className="font-medium tabular-nums text-neutral-800">
                                                                {stock?.quantity ?? 0}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
