
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InventorySearch from "@/components/search/InventorySearch";

export default function StockViewPage() {
    const [stockItems, setStockItems] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadStock() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/stock-view", {
                    cache: "no-store",
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Unable to load stock."
                    );
                }

                setStockItems(result.data || []);
            } catch (err) {
                setError(err.message || "Something went wrong.");
            } finally {
                setLoading(false);
            }
        }

        loadStock();
    }, []);

    // SEARCH PRODUCTS AND THEIR SUB-PRODUCTS
    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return stockItems;

        return stockItems
            .map((product) => {
                const productMatches = [
                    product.productName,
                    product.categoryName,
                    product.brandName,
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);

                if (productMatches) return product;

                const matchingSubProducts = product.subProducts.filter(
                    (item) =>
                        item.name.toLowerCase().includes(query)
                );

                if (matchingSubProducts.length === 0) return null;

                return {
                    ...product,
                    subProducts: matchingSubProducts,
                };
            })
            .filter(Boolean);
    }, [stockItems, search]);

    // SUMMARY
    const totalProducts = stockItems.length;

    const totalSubProducts = stockItems.reduce(
        (total, product) => total + product.subProducts.length,
        0
    );

    const totalUnits = stockItems.reduce(
        (total, product) => total + product.totalStock,
        0
    );

    const formatPrice = (value) =>
        Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return (
        <main className="min-h-screen bg-[#f8f8f7]">

            {/* HEADER */}
            <header className="border-b border-neutral-200 bg-white">
                <div className="flex h-16 items-center justify-around">
                    <Link
                        href="/"
                        className="shrink-0 text-lg font-semibold tracking-tight text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    <div className="hidden w-xl md:block">
                        <InventorySearch />
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/stock-view"
                            className="rounded-lg border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-white"
                        >
                            Stock View
                        </Link>

                        <Link
                            href="/billing"
                            className="rounded-lg border-2 border-neutral-900 px-4 py-2 hover:bg-neutral-900 hover:text-white"
                        >
                            Billing
                        </Link>

                        <Link
                            href="/manage"
                            className="rounded-lg border-2 border-neutral-900 px-4 py-2 hover:bg-neutral-900 hover:text-white"
                        >
                            Manage
                        </Link>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8">

                {/* PAGE TITLE */}
                <div className="mb-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                        Inventory Overview
                    </p>

                    <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
                        Stock View
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        Complete stock overview across all branches.
                    </p>
                </div>

                {/* SUMMARY */}
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <p className="text-sm text-neutral-500">
                            Total Products
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-neutral-900">
                            {totalProducts}
                        </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <p className="text-sm text-neutral-500">
                            Total Sub-products
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-neutral-900">
                            {totalSubProducts}
                        </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white p-4">
                        <p className="text-sm text-neutral-500">
                            Total Stock Units
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-neutral-900">
                            {totalUnits.toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* SEARCH */}
                <div className="mb-6">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search product, category, brand or sub-product..."
                        className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm outline-none focus:border-neutral-500"
                    />

                    <p className="mt-2 text-xs text-neutral-400">
                        Showing {filteredItems.length} of {stockItems.length} products
                    </p>
                </div>

                {/* LOADING */}
                {loading ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
                        Loading stock...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                        {error}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                        <p className="font-medium text-neutral-700">
                            No products found
                        </p>
                        <p className="mt-1 text-sm text-neutral-400">
                            Try another search.
                        </p>
                    </div>
                ) : (

                    /* PRODUCT CARDS */
                    <div className="grid gap-5 lg:grid-cols-3">

                        {filteredItems.map((product) => (

                            <article
                                key={product.id}
                                className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
                            >

                                {/* PRODUCT HEADER */}
                                <div className="flex items-start justify-between gap-4 border-b border-neutral-100 p-5">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                                            {product.categoryName} · {product.brandName}
                                        </p>

                                        <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                                            {product.productName}
                                        </h2>

                                        <p className="mt-1 text-xs text-neutral-500">
                                            {product.subProducts.length} sub-products
                                        </p>
                                    </div>

                                    <div className="shrink-0 rounded-lg bg-neutral-100 px-4 py-3 text-center">
                                        <p className="text-xs text-neutral-500">
                                            Total Stock
                                        </p>

                                        <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
                                            {product.totalStock}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-5">

                                    {/* PRODUCT BRANCH SUMMARY */}
                                    <div className="mb-5">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                            Overall Branch Stock
                                        </p>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {product.branches.map((branch) => (
                                                <div
                                                    key={branch.id}
                                                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2"
                                                >
                                                    <span className="text-sm text-neutral-600">
                                                        {branch.name}
                                                    </span>

                                                    <span className="font-semibold tabular-nums text-neutral-900">
                                                        {branch.quantity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ALL SUB-PRODUCTS */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                                            Sub-products & Purchase Prices
                                        </p>

                                        <div className="space-y-3">

                                            {product.subProducts.map((item) => (

                                                <div
                                                    key={item.id}
                                                    className="rounded-lg border border-neutral-200 p-3"
                                                >

                                                    {/* SUB-PRODUCT DETAILS */}
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <h3 className="font-semibold text-neutral-900">
                                                                {item.name}
                                                            </h3>

                                                            <p className="mt-1 text-xs text-neutral-500">
                                                                Purchase Price / Unit
                                                            </p>

                                                            <p className="text-sm font-medium text-neutral-800">
                                                                ₹{formatPrice(item.purchasePrice)}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-xs text-neutral-500">
                                                                Total Stock
                                                            </p>

                                                            <p className="text-xl font-semibold tabular-nums text-neutral-900">
                                                                {item.totalStock}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* SUB-PRODUCT BRANCH STOCK */}
                                                    <div className="mt-3 border-t border-neutral-100 pt-3">
                                                        <p className="mb-2 text-xs font-medium text-neutral-400">
                                                            Branch-wise Stock
                                                        </p>

                                                        <div className="grid gap-2 sm:grid-cols-1">
                                                            {item.branches.map((branch) => (
                                                                <div
                                                                    key={branch.id}
                                                                    className="flex justify-between gap-2 text-xs"
                                                                >
                                                                    <span className="text-neutral-500">
                                                                        {branch.name}
                                                                    </span>

                                                                    <span className="font-semibold tabular-nums text-neutral-800">
                                                                        {branch.quantity}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                </div>
                                            ))}

                                        </div>
                                    </div>

                                </div>
                            </article>
                        ))}

                    </div>
                )}
            </div>
        </main>
    );
}
