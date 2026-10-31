"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getBrandImage } from "@/lib/images";

export default function BrandSearch({
    brands,
    branchId,
    categoryId,
}) {
    const [search, setSearch] = useState("");

    const filteredBrands = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return brands;

        return brands.filter((brand) =>
            brand.name.toLowerCase().includes(query)
        );
    }, [brands, search]);

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
                        placeholder="Search brands..."
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
                        {filteredBrands.length} brands found
                    </p>
                )}
            </div>

            {/* BRANDS GRID */}
            {filteredBrands.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-neutral-700">
                        No brands found
                    </p>

                    <p className="mt-1 text-xs text-neutral-400">
                        Try another brand name.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {filteredBrands.map((brand) => (
                        <Link
                            key={brand.id}
                            href={`/branches/${branchId}/category/${categoryId}/brand/${brand.id}`}
                            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-400"
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
    );
}
