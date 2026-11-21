
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCategoryImage } from "@/lib/images";

export default function InventorySearch({
    branchId = null,
    categoryId = null,
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setResults([]);
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            setLoading(true);

            try {
                const params = new URLSearchParams();
                params.set("q", trimmedQuery);

                if (branchId) params.set("branchId", branchId);
                if (categoryId) params.set("categoryId", categoryId);

                const response = await fetch(
                    `/api/search?${params.toString()}`,
                    {
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Search failed.");
                }

                setResults(data.products || []);
                setOpen(true);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.error("Search error:", error);
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [query, branchId, categoryId]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                inputRef.current?.focus();
            }

            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className="relative">
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>

                <input
                    ref={inputRef}
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    onFocus={() => {
                        if (query.trim()) setOpen(true);
                    }}
                    placeholder="Search products and sub-products..."
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white pl-11 pr-16 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-950"
                />

                <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-400 sm:block">
                    Ctrl K
                </div>
            </div>

            {open && query.trim() && (
                <>
                    <button
                        type="button"
                        aria-label="Close search"
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                    />

                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                        {loading && (
                            <div className="px-4 py-5 text-center text-sm text-neutral-500">
                                Searching...
                            </div>
                        )}

                        {!loading && results.length === 0 && (
                            <div className="px-4 py-6 text-center">
                                <p className="text-sm font-medium text-neutral-700">
                                    No products found
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                    Try a different product name.
                                </p>
                            </div>
                        )}

                        {!loading && results.map(product => (
                            <SearchResult
                                key={`${product.resultType}-${product.id}`}
                                product={product}
                                branchId={branchId}
                                onSelect={() => setOpen(false)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function SearchResult({ product, branchId, onSelect }) {
    const totalQuantity = (product.inventory || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0
    );

    const availableBranchId =
        branchId || product.inventory?.[0]?.branchId;

    // Both parent and sub-product results open the parent product page.
    const parentProductId =
        product.parentProductId || product.id;

    const productHref = availableBranchId && parentProductId
        ? `/branches/${availableBranchId}/products/${parentProductId}`
        : null;

    const imageUrl =
        product.imageUrl || getCategoryImage(product.category);

    return (
        <div className="border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50">
            <div className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        onError={event => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                                "/categories/earphone.png";
                        }}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    {productHref ? (
                        <Link
                            href={productHref}
                            onClick={onSelect}
                            className="block truncate text-sm font-medium text-neutral-900 hover:underline"
                        >
                            {product.name}
                        </Link>
                    ) : (
                        <p className="truncate text-sm font-medium text-neutral-900">
                            {product.name}
                        </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        {product.resultType === "sub_product" && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                                Sub-product
                            </span>
                        )}

                        {product.category && (
                            <span>{product.category.name}</span>
                        )}

                        {product.brand && (
                            <>
                                <span>·</span>
                                <span>{product.brand.name}</span>
                            </>
                        )}
                    </div>

                    {product.resultType === "sub_product" && (
                        <p className="mt-1 truncate text-xs text-neutral-400">
                            Under: {product.parentProductName}
                        </p>
                    )}
                </div>

                <div className="shrink-0 text-right">
                    <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                        Total
                    </p>

                    <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {totalQuantity}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {(product.inventory || []).map(item => {
                    const href =
                        `/branches/${item.branchId}/products/${parentProductId}`;

                    return (
                        <Link
                            key={item.branchId}
                            href={href}
                            onClick={onSelect}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item.quantity > 0
                                    ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-900 hover:text-white"
                                    : "bg-red-50 text-red-600 hover:bg-red-100"
                                }`}
                        >
                            {item.branchName} · {item.quantity} ↗
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
