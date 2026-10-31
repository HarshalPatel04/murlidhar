
"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/inventory/ProductCard";

export default function ProductSearch({
    products,
    quantityMap,
    branchId,
    categoryName,
}) {
    const [search, setSearch] = useState("");

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return products;

        return products.filter((product) =>
            product.name?.toLowerCase().includes(query)
        );
    }, [products, search]);

    return (
        <div>
            {/* SEARCH */}
            <div className="mb-6">
                <div className="relative w-full">
                    <svg
                        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-4-4" />
                    </svg>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search products..."
                        className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-12 pr-12 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {search && (
                    <p className="mt-2 text-xs text-neutral-400">
                        {filteredProducts.length} product
                        {filteredProducts.length !== 1 ? "s" : ""} found
                    </p>
                )}
            </div>

            {/* PRODUCT GRID */}
            {filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-neutral-700">
                        No products found
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                        Try another product name.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={{
                                ...product,
                                category: {
                                    name: categoryName,
                                },
                            }}
                            quantity={
                                quantityMap[product.id] ?? 0
                            }
                            branchId={branchId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
