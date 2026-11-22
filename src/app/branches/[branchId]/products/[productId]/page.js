
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import InventorySearch from "@/components/search/InventorySearch";

export default function ProductSubProductsPage() {
    const { branchId, productId } = useParams();
    const router = useRouter();

    const [product, setProduct] = useState(null);
    const [subProducts, setSubProducts] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [selectedSubProduct, setSelectedSubProduct] = useState(null);
    const [transactionType, setTransactionType] = useState("purchase");
    const [quantity, setQuantity] = useState("1");
    const [transactionDate, setTransactionDate] = useState("");
    const [transactionTime, setTransactionTime] = useState("");
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState("");

    const loadSubProducts = useCallback(async () => {
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
    }, [productId]);

    useEffect(() => {
        if (productId) {
            loadSubProducts();
        }
    }, [productId, loadSubProducts]);

    function openTransaction(item, type) {
        const now = new Date();

        const localDate = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
        ].join("-");

        const localTime = [
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
        ].join(":");

        setSelectedSubProduct(item);
        setTransactionType(type);
        setQuantity("1");
        setTransactionDate(localDate);
        setTransactionTime(localTime);
        setModalError("");
        setShowModal(true);
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setSelectedSubProduct(null);
        setModalError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!selectedSubProduct) return;

        const quantityValue = Number(quantity);

        if (
            !Number.isSafeInteger(quantityValue) ||
            quantityValue <= 0
        ) {
            setModalError(
                "Enter a valid quantity greater than zero."
            );
            return;
        }

        const selectedBranch =
            selectedSubProduct.branches?.find(
                (branch) =>
                    String(branch.id) === String(branchId)
            );

        const currentStock = selectedBranch?.quantity ?? 0;

        if (
            transactionType === "sale" &&
            quantityValue > currentStock
        ) {
            setModalError(
                `Only ${currentStock} item${currentStock === 1 ? "" : "s"} available in this branch.`
            );
            return;
        }

        if (!transactionDate || !transactionTime) {
            setModalError("Please select both date and time.");
            return;
        }

        const transactionDateTime = new Date(
            `${transactionDate}T${transactionTime}`
        );

        if (Number.isNaN(transactionDateTime.getTime())) {
            setModalError("Invalid date or time.");
            return;
        }

        setSaving(true);
        setModalError("");

        try {
            const response = await fetch(
                "/api/inventory/sub-product-transaction",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        branchId,
                        subProductId: selectedSubProduct.id,
                        type: transactionType,
                        quantity: quantityValue,
                        transactionAt:
                            transactionDateTime.toISOString(),
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save transaction."
                );
            }

            setShowModal(false);
            setSelectedSubProduct(null);

            await loadSubProducts();
            router.refresh();

        } catch (err) {
            setModalError(
                err.message || "Unable to save transaction."
            );
        } finally {
            setSaving(false);
        }
    }

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

                <button
                    type="button"
                    onClick={loadSubProducts}
                    className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
                >
                    Retry
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[rgb(248,248,247)]">

            {/* HEADER */}
            <header className="border-b border-neutral-200 bg-white">
                <div className="flex justify-around h-16 items-center">
                    <Link
                        href="/"
                        className="shrink-0 text-lg font-semibold tracking-tight text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    {/* SEARCH PLACEHOLDER */}
                    <div className="hidden md:block w-xl">
                        <InventorySearch />
                    </div>

                    {/* MANAGE BUTTON */}
                    <div className="flex items-center gap-3">
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

            <div className="mx-auto max-w-7xl mt-4">
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
                            const selectedBranch =
                                item.branches?.find(
                                    (branch) =>
                                        String(branch.id) ===
                                        String(branchId)
                                );

                            const stock =
                                selectedBranch?.quantity ?? 0;

                            return (
                                <div
                                    key={item.id}
                                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white"
                                >

                                    <div className="p-4">
                                        <h2 className="font-semibold text-center mb-6 text-2xl text-neutral-900">
                                            {item.name}
                                        </h2>

                                        <div className="flex justify-between">
                                            <p className="mt-2 text-sm text-neutral-500">
                                                {selectedBranch?.name || "Selected branch"} Stock
                                            </p>

                                            <p
                                                className={`text-2xl font-semibold tabular-nums ${stock === 0
                                                    ? "text-red-600"
                                                    : "text-neutral-900"
                                                    }`}
                                            >
                                                {stock}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openTransaction(item, "purchase")
                                                }
                                                className="rounded-lg bg-neutral-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                                            >
                                                + Purchase
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openTransaction(item, "sale")
                                                }
                                                disabled={stock <= 0}
                                                className="rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                − Sale
                                            </button>
                                        </div>

                                        <div className="mt-4 border-t border-neutral-100 pt-3">
                                            <p className="mb-2 text-xs font-medium text-neutral-400">
                                                All Branches
                                            </p>

                                            <div className="space-y-2">
                                                {branches.map((branch) => {
                                                    const branchStock =
                                                        item.branches?.find(
                                                            (entry) =>
                                                                entry.id === branch.id
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
                                                                {branchStock?.quantity ?? 0}
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
                )
                }
            </div>

            {showModal && selectedSubProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl">
                        <form
                            onSubmit={handleSubmit}
                            className="p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                                        {transactionType === "purchase"
                                            ? "Purchase"
                                            : "Sale"}
                                    </p>

                                    <h3 className="mt-1 text-xl font-semibold text-neutral-900">
                                        {selectedSubProduct.name}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="mt-6 rounded-lg bg-neutral-50 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500">
                                        Current stock
                                    </span>

                                    <span className="font-semibold text-neutral-900">
                                        {selectedSubProduct.branches?.find(
                                            (branch) =>
                                                String(branch.id) ===
                                                String(branchId)
                                        )?.quantity ?? 0}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Quantity
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    autoFocus
                                    required
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Date
                                </label>

                                <input
                                    type="date"
                                    value={transactionDate}
                                    onChange={(event) =>
                                        setTransactionDate(event.target.value)
                                    }
                                    required
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Time
                                </label>

                                <input
                                    type="time"
                                    value={transactionTime}
                                    onChange={(event) =>
                                        setTransactionTime(event.target.value)
                                    }
                                    required
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            {modalError && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                    {modalError}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : transactionType === "purchase"
                                            ? "Confirm Purchase"
                                            : "Confirm Sale"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
