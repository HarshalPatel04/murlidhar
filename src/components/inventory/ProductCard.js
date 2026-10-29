"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductCard({
    product,
    quantity,
    branchId,
}) {
    const router = useRouter();

    const [showModal, setShowModal] = useState(false);
    const [type, setType] = useState(null);

    const [amount, setAmount] = useState("1");
    const [transactionDate, setTransactionDate] = useState("");
    const [transactionTime, setTransactionTime] = useState("");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function openTransaction(transactionType) {
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

        setType(transactionType);
        setAmount("1");
        setTransactionDate(localDate);
        setTransactionTime(localTime);
        setError("");
        setShowModal(true);
    }

    function closeModal() {
        if (saving) return;

        setShowModal(false);
        setType(null);
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const quantityValue = Number(amount);

        if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
            setError("Enter a valid quantity greater than zero.");
            return;
        }

        if (type === "sale" && quantityValue > quantity) {
            setError(
                `Only ${quantity} item${
                    quantity === 1 ? "" : "s"
                } available in this branch.`
            );
            return;
        }

        if (!transactionDate || !transactionTime) {
            setError("Please select both date and time.");
            return;
        }

        const transactionDateTime = new Date(
            `${transactionDate}T${transactionTime}`
        );

        if (Number.isNaN(transactionDateTime.getTime())) {
            setError("Invalid date or time.");
            return;
        }

        setSaving(true);
        setError("");

                try {
            const response = await fetch("/api/inventory/transaction", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    branchId,
                    productId: product.id,
                    type,
                    quantity: quantityValue,
                    transactionAt: transactionDateTime.toISOString(),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save transaction."
                );
            }

            setShowModal(false);
            setType(null);

            router.refresh();
        } catch (err) {
            setError(
                err?.message || "Unable to save transaction."
            );
        } finally {
            setSaving(false);
        }
    }

    const isPurchase = type === "purchase";

    return (
        <>
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {/* IMAGE */}

                <div className="flex aspect-square items-center justify-center bg-neutral-100">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="text-xs text-neutral-400">
                                Product Image
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT */}

                <div className="p-4">
                    <h2 className="font-medium leading-5 text-neutral-900">
                        {product.name}
                    </h2>

                    <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs text-neutral-400">
                                Stock
                            </p>

                            <p
                                className={`mt-0.5 text-xl font-semibold ${
                                    quantity === 0
                                        ? "text-red-600"
                                        : "text-neutral-900"
                                }`}
                            >
                                {quantity}
                            </p>
                        </div>

                        <div className="flex items-center overflow-hidden rounded-lg border border-neutral-300">
                            {/* SELL */}

                            <button
                                type="button"
                                onClick={() =>
                                    openTransaction("sale")
                                }
                                disabled={quantity === 0}
                                title={
                                    quantity === 0
                                        ? "No stock available"
                                        : "Record sale"
                                }
                                className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                                −
                            </button>

                            {/* QUANTITY */}

                            <div className="flex h-9 min-w-10 items-center justify-center border-x border-neutral-300 px-2 text-sm font-medium">
                                {quantity}
                            </div>

                            {/* PURCHASE */}

                            <button
                                type="button"
                                onClick={() =>
                                    openTransaction(
                                        "purchase"
                                    )
                                }
                                title="Record purchase"
                                className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TRANSACTION MODAL */}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl">
                        <form
                            onSubmit={handleSubmit}
                            className="p-6"
                        >
                            {/* HEADER */}

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                                        {isPurchase
                                            ? "Purchase"
                                            : "Sale"}
                                    </p>

                                    <h3 className="mt-1 text-xl font-semibold text-neutral-900">
                                        {product.name}
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

                            {/* CURRENT STOCK */}

                            <div className="mt-6 rounded-lg bg-neutral-50 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-neutral-500">
                                        Current stock
                                    </span>

                                    <span className="font-semibold text-neutral-900">
                                        {quantity}
                                    </span>
                                </div>
                            </div>

                            {/* QUANTITY */}

                            <div className="mt-5">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Quantity
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={amount}
                                    onChange={(event) =>
                                        setAmount(
                                            event.target.value
                                        )
                                    }
                                    autoFocus
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            {/* DATE */}

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Date
                                </label>

                                <input
                                    type="date"
                                    value={transactionDate}
                                    onChange={(event) =>
                                        setTransactionDate(
                                            event.target.value
                                        )
                                    }
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            {/* TIME */}

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-neutral-700">
                                    Time
                                </label>

                                <input
                                    type="time"
                                    value={transactionTime}
                                    onChange={(event) =>
                                        setTransactionTime(
                                            event.target.value
                                        )
                                    }
                                    className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-neutral-500"
                                />
                            </div>

                            {/* ERROR */}

                            {error && (
                                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* ACTIONS */}

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
                                        : isPurchase
                                        ? "Confirm Purchase"
                                        : "Confirm Sale"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}