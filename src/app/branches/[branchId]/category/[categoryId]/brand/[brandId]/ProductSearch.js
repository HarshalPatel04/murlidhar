
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/inventory/ProductCard";
import { getProductImage } from "@/lib/images";

export default function ProductSearch({
    products,
    subProducts = [],
    quantityMap,
    branchId,
    categoryName,
}) {
    const [search, setSearch] = useState("");
    const router = useRouter();

    const { filteredProducts, filteredSubProducts } = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return {
                filteredProducts: products,
                filteredSubProducts: [],
            };
        }

        return {
            filteredProducts: products.filter((product) =>
                product.name?.toLowerCase().includes(query)
            ),

            filteredSubProducts: subProducts.filter((item) =>
                item.name?.toLowerCase().includes(query) ||
                item.parentName?.toLowerCase().includes(query)
            ),
        };
    }, [products, subProducts, search]);

    const totalResults =
        filteredProducts.length + filteredSubProducts.length;

    function openParentProduct(productId) {
        router.push(`/branches/${branchId}/products/${productId}`);
    }

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
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search products and sub-products..."
                        className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-12 pr-12 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
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
                        {totalResults} result{totalResults !== 1 ? "s" : ""} found
                    </p>
                )}
            </div>

            {/* RESULTS */}
            {totalResults === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-neutral-700">
                        No products found
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                        Try another product or sub-product name.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* PARENT PRODUCTS */}
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={`product-${product.id}`}
                            product={{
                                ...product,
                                category: { name: categoryName },
                            }}
                            quantity={quantityMap[product.id] ?? 0}
                            branchId={branchId}
                        />
                    ))}

                    {/* SUB-PRODUCTS */}
                    {filteredSubProducts.map((item) => (
                        <button
                            type="button"
                            key={`sub-product-${item.id}`}
                            onClick={() => openParentProduct(item.product_id)}
                            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white text-left transition-shadow hover:shadow-md"
                        >
                            <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-white p-6">
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        loading="lazy"
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <img
                                        src={getProductImage({
                                            name: item.parentName,
                                        })}
                                        alt={item.parentName}
                                        loading="lazy"
                                        className="h-full w-full object-contain"
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3 p-4">
                                <div className="min-w-0">
                                    <h2 className="font-medium leading-5 text-neutral-900">
                                        {item.name}
                                    </h2>

                                    <p className="mt-1 truncate text-xs text-neutral-400">
                                        {item.parentName}
                                    </p>

                                    <p className="mt-2 text-xs text-neutral-400">
                                        Sub-product
                                    </p>
                                </div>

                                <div className="shrink-0 text-center">
                                    <p className="text-xs text-neutral-400">
                                        Stock
                                    </p>

                                    <p
                                        className={`mt-0.5 text-xl font-semibold ${item.quantity === 0
                                                ? "text-red-600"
                                                : "text-neutral-900"
                                            }`}
                                    >
                                        {item.quantity}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
