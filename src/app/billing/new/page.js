
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

// Allocate an exact total proportionally, with all rounding
// handled in paise so line totals always add up to the bill total.
function allocateLineTotals(cart, negotiatedCents) {
    if (!cart.length) return [];

    const weights = cart.map((item) => {
        const price = Number(item.defaultSellingPrice) || 0;
        return Math.max(0, Math.round(price * 100)) * item.quantity;
    });

    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // If all default prices are zero, use quantities as weights.
    const allocationWeights =
        totalWeight > 0
            ? weights
            : cart.map((item) => item.quantity);

    totalWeight = allocationWeights.reduce(
        (sum, weight) => sum + weight,
        0
    );

    if (totalWeight <= 0) return cart.map(() => 0);

    const allocations = allocationWeights.map((weight) => {
        const exactShare = (negotiatedCents * weight) / totalWeight;

        return {
            cents: Math.floor(exactShare),
            remainder: exactShare - Math.floor(exactShare),
        };
    });

    const allocatedCents = allocations.reduce(
        (sum, item) => sum + item.cents,
        0
    );

    let remainingCents = negotiatedCents - allocatedCents;

    const order = allocations
        .map((item, index) => ({
            index,
            remainder: item.remainder,
        }))
        .sort((a, b) => b.remainder - a.remainder);

    for (let i = 0; i < remainingCents; i++) {
        allocations[order[i % order.length].index].cents += 1;
    }

    return allocations.map((item) => item.cents);
}

export default function NewBillPage() {
    const router = useRouter();

    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState("");

    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [negotiatedTotal, setNegotiatedTotal] = useState("");
    const [negotiatedTotalEdited, setNegotiatedTotalEdited] =
        useState(false);

    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Load branches
    useEffect(() => {
        async function loadBranches() {
            try {
                const response = await fetch("/api/bills/branches", {
                    cache: "no-store",
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "Unable to load branches."
                    );
                }

                setBranches(result.data || result.branches || []);
            } catch (err) {
                console.error(err);
                setError(err.message || "Unable to load branches.");
            } finally {
                setLoadingBranches(false);
            }
        }

        loadBranches();
    }, []);

    // Load products for selected branch
    const loadProducts = useCallback(async () => {
        if (!branchId) {
            setProducts([]);
            return;
        }

        try {
            setLoadingProducts(true);
            setError("");

            const params = new URLSearchParams({
                branchId,
                search: search.trim(),
            });

            const response = await fetch(
                `/api/bills/products?${params.toString()}`,
                { cache: "no-store" }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to load products."
                );
            }

            setProducts(result.data || []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Unable to load products.");
        } finally {
            setLoadingProducts(false);
        }
    }, [branchId, search]);

    useEffect(() => {
        const timeout = setTimeout(loadProducts, 250);
        return () => clearTimeout(timeout);
    }, [loadProducts]);

    // Clear cart when branch changes
    function handleBranchChange(value) {
        setBranchId(value);
        setCart([]);
        setSearch("");
        setProducts([]);
        setNegotiatedTotal("");
        setNegotiatedTotalEdited(false);
        setError("");
        setSuccess("");
    }

    // Add product to cart
    function addToCart(product) {
        setError("");
        setSuccess("");

        if (product.stock <= 0) {
            setError(`${product.name} is out of stock.`);
            return;
        }

        setCart((current) => {
            const existing = current.find(
                (item) => item.id === product.id
            );

            if (existing) {
                if (existing.quantity >= product.stock) {
                    setError(
                        `Only ${product.stock} units available for ${product.name}.`
                    );
                    return current;
                }

                return current.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...current,
                {
                    id: product.id,
                    name: product.name,
                    purchasePrice: Number(product.purchasePrice) || 0,
                    defaultSellingPrice: Number(product.sellingPrice) || 0,
                    stock: product.stock,
                    quantity: 1,
                },
            ];
        });
    }

    function updateQuantity(id, value) {
        const quantity = Number(value);

        if (!Number.isInteger(quantity) || quantity < 1) return;

        setCart((current) =>
            current.map((item) =>
                item.id === id
                    ? {
                        ...item,
                        quantity: Math.min(quantity, item.stock),
                    }
                    : item
            )
        );
    }

    function removeItem(id) {
        setCart((current) =>
            current.filter((item) => item.id !== id)
        );
    }

    // Original total is calculated using default selling prices.
    const originalTotalCents = useMemo(() => {
        return cart.reduce((sum, item) => {
            const unitPriceCents = Math.round(
                Number(item.defaultSellingPrice) * 100
            );

            return sum + unitPriceCents * item.quantity;
        }, 0);
    }, [cart]);

    // Before the user edits the negotiated total, automatically
    // keep it equal to the original cart total.
    useEffect(() => {
        if (!negotiatedTotalEdited) {
            setNegotiatedTotal(
                (originalTotalCents / 100).toFixed(2)
            );
        }
    }, [originalTotalCents, negotiatedTotalEdited]);

    const finalTotalCents = useMemo(() => {
        const value = Number(negotiatedTotal);

        if (
            negotiatedTotal.trim() === "" ||
            !Number.isFinite(value) ||
            value < 0
        ) {
            return 0;
        }

        return Math.round(value * 100);
    }, [negotiatedTotal]);

    const lineTotals = useMemo(() => {
        return allocateLineTotals(cart, finalTotalCents);
    }, [cart, finalTotalCents]);

    const totals = useMemo(() => {
        const totalQuantity = cart.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        const estimatedProfitCents = cart.reduce(
            (sum, item, index) => {
                const purchaseCostCents = Math.round(
                    Number(item.purchasePrice) * 100
                ) * item.quantity;

                return sum + (lineTotals[index] || 0) - purchaseCostCents;
            },
            0
        );

        const differenceCents =
            originalTotalCents - finalTotalCents;

        return {
            totalQuantity,
            estimatedProfit: estimatedProfitCents / 100,
            originalTotal: originalTotalCents / 100,
            finalTotal: finalTotalCents / 100,
            difference: differenceCents / 100,
        };
    }, [cart, lineTotals, originalTotalCents, finalTotalCents]);

    function handleNegotiatedTotalChange(value) {
        setNegotiatedTotalEdited(true);
        setNegotiatedTotal(value);
    }

    async function createBill() {
        setError("");
        setSuccess("");

        if (!branchId) {
            setError("Please select a branch.");
            return;
        }

        if (cart.length === 0) {
            setError("Please add at least one item.");
            return;
        }

        const finalTotal = Number(negotiatedTotal);

        if (
            negotiatedTotal.trim() === "" ||
            !Number.isFinite(finalTotal) ||
            finalTotal < 0 ||
            Math.round(finalTotal * 100) !== finalTotal * 100
        ) {
            setError(
                "Enter a valid negotiated grand total with up to 2 decimal places."
            );
            return;
        }

        for (const item of cart) {
            if (
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > item.stock
            ) {
                setError(`Invalid quantity for ${item.name}.`);
                return;
            }
        }

        const difference = totals.difference;

        let confirmationMessage =
            `Original cart total: ${money(totals.originalTotal)}\n` +
            `Negotiated total: ${money(finalTotal)}\n`;

        if (difference > 0) {
            confirmationMessage +=
                `Discount: ${money(difference)}\n`;
        } else if (difference < 0) {
            confirmationMessage +=
                `Additional charge: ${money(Math.abs(difference))}\n`;
        } else {
            confirmationMessage += "No discount or additional charge.\n";
        }

        confirmationMessage +=
            "\nStock will be deducted immediately. Continue?";

        const confirmed = window.confirm(confirmationMessage);

        if (!confirmed) return;

        try {
            setSubmitting(true);

            const response = await fetch("/api/bills", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    branchId,
                    customerName: customerName.trim() || null,
                    customerPhone: customerPhone.trim() || null,
                    negotiatedTotal: finalTotal,
                    items: cart.map((item) => ({
                        subProductId: item.id,
                        quantity: item.quantity,
                    })),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to create bill."
                );
            }

            const billId = result.bill?.bill_id;

            if (!billId) {
                throw new Error(
                    "Bill was created, but its ID was not returned."
                );
            }

            setSuccess("Bill created successfully.");

            router.push("/billing");
        } catch (err) {
            console.error(err);
            setError(err.message || "Unable to create bill.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-neutral-50">
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
                    <Link
                        href="/"
                        className="text-lg font-semibold text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    <Link
                        href="/billing"
                        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
                    >
                        Bill History
                    </Link>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-8">
                <div className="mb-7">
                    <Link
                        href="/billing"
                        className="text-sm text-neutral-500 hover:text-black"
                    >
                        ← Back to Billing
                    </Link>

                    <h1 className="mt-4 text-3xl font-semibold text-neutral-900">
                        Create New Bill
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        Add products, enter one negotiated total and confirm the sale.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    {/* PRODUCT SELECTION */}
                    <div className="space-y-5">
                        <div className="rounded-xl border border-neutral-200 bg-white p-5">
                            <label className="mb-2 block text-sm font-medium text-neutral-700">
                                Select Branch
                            </label>

                            <select
                                value={branchId}
                                onChange={(e) =>
                                    handleBranchChange(e.target.value)
                                }
                                disabled={loadingBranches}
                                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-3 text-sm outline-none focus:border-neutral-600"
                            >
                                <option value="">
                                    {loadingBranches
                                        ? "Loading branches..."
                                        : "Choose a branch"}
                                </option>

                                {branches.map((branch) => (
                                    <option
                                        key={branch.id}
                                        value={branch.id}
                                    >
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-xl border border-neutral-200 bg-white p-5">
                            <div className="mb-4">
                                <h2 className="font-semibold text-neutral-900">
                                    Add Sub-products
                                </h2>

                                <p className="mt-1 text-xs text-neutral-500">
                                    Search by sub-product name.
                                </p>
                            </div>

                            <input
                                type="search"
                                placeholder="Search sub-products..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                disabled={!branchId}
                                className="mb-4 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-neutral-600 disabled:bg-neutral-100"
                            />

                            {!branchId && (
                                <p className="py-8 text-center text-sm text-neutral-400">
                                    Select a branch to view its products.
                                </p>
                            )}

                            {branchId && loadingProducts && (
                                <p className="py-8 text-center text-sm text-neutral-500">
                                    Loading products...
                                </p>
                            )}

                            {branchId &&
                                !loadingProducts &&
                                products.length === 0 && (
                                    <p className="py-8 text-center text-sm text-neutral-400">
                                        No matching sub-products found.
                                    </p>
                                )}

                            <div className="divide-y divide-neutral-100">
                                {products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="flex items-center justify-between gap-4 py-4"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-500">
                                                {[product.brandName, product.productName, product.categoryName]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>

                                            <p className="mt-1 font-medium text-neutral-900">
                                                {product.name}
                                            </p>

                                            <p className="mt-1 text-xs text-neutral-500">
                                                Stock: {product.stock}
                                            </p>

                                            <p className="mt-1 text-sm text-neutral-700">
                                                Default price: {money(product.sellingPrice)}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => addToCart(product)}
                                            disabled={product.stock <= 0}
                                            className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                                        >
                                            {product.stock > 0
                                                ? "Add"
                                                : "Out of stock"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CART */}
                    <aside className="space-y-5">
                        <div className="rounded-xl border border-neutral-200 bg-white p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-semibold text-neutral-900">
                                    Bill Items
                                </h2>

                                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
                                    {cart.length} items
                                </span>
                            </div>

                            {cart.length === 0 && (
                                <p className="py-8 text-center text-sm text-neutral-400">
                                    Your bill is empty.
                                </p>
                            )}

                            <div className="space-y-5">
                                {cart.map((item, index) => {
                                    const lineTotal =
                                        (lineTotals[index] || 0) / 100;

                                    const profit =
                                        lineTotal -
                                        item.purchasePrice * item.quantity;

                                    return (
                                        <div
                                            key={item.id}
                                            className="border-b border-neutral-100 pb-5 last:border-0"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium text-neutral-900">
                                                        {item.name}
                                                    </p>

                                                    <p className="mt-1 text-xs text-neutral-500">
                                                        Default price:{" "}
                                                        {money(item.defaultSellingPrice)}
                                                        {" / unit"}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeItem(item.id)
                                                    }
                                                    className="text-xs text-red-600 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="mt-3">
                                                <label className="mb-1 block text-xs text-neutral-500">
                                                    Quantity
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.stock}
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        updateQuantity(
                                                            item.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                                                />
                                            </div>

                                            <div className="mt-3 flex justify-between text-sm">
                                                <span className="text-neutral-500">
                                                    Adjusted line total
                                                </span>

                                                <span className="font-semibold text-neutral-900">
                                                    {money(lineTotal)}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-xs text-neutral-400">
                                                Estimated profit: {money(profit)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CUSTOMER */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-5">
                            <h2 className="mb-4 font-semibold text-neutral-900">
                                Customer Details
                                <span className="ml-2 text-xs font-normal text-neutral-400">
                                    Optional
                                </span>
                            </h2>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Customer name"
                                    value={customerName}
                                    onChange={(e) =>
                                        setCustomerName(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
                                />

                                <input
                                    type="tel"
                                    placeholder="Mobile number"
                                    value={customerPhone}
                                    onChange={(e) =>
                                        setCustomerPhone(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
                                />
                            </div>
                        </div>

                        {/* NEGOTIATED TOTAL */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-5">
                            <h2 className="mb-4 font-semibold text-neutral-900">
                                Bill Summary
                            </h2>

                            <div className="flex justify-between text-sm text-neutral-500">
                                <span>Total quantity</span>
                                <span>{totals.totalQuantity}</span>
                            </div>

                            <div className="mt-3 flex justify-between text-sm">
                                <span className="text-neutral-500">
                                    Original cart total
                                </span>
                                <span className="font-medium text-neutral-900">
                                    {money(totals.originalTotal)}
                                </span>
                            </div>

                            <div className="my-4 border-t border-neutral-200" />

                            <label className="mb-2 block text-sm font-semibold text-neutral-900">
                                Negotiated Grand Total
                            </label>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                                    ₹
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={negotiatedTotal}
                                    onChange={(e) =>
                                        handleNegotiatedTotalChange(
                                            e.target.value
                                        )
                                    }
                                    disabled={cart.length === 0}
                                    placeholder="Enter final amount"
                                    className="w-full rounded-lg border border-neutral-300 py-3 pl-8 pr-3 text-xl font-semibold text-neutral-900 outline-none focus:border-neutral-700 disabled:bg-neutral-100"
                                />
                            </div>

                            <p className="mt-2 text-xs text-neutral-500">
                                Enter the final amount agreed with the customer.
                                It can be lower or higher than the original total.
                            </p>

                            {cart.length > 0 && (
                                <div className="mt-4 rounded-lg bg-neutral-50 p-3">
                                    {totals.difference > 0 ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-600">
                                                Discount
                                            </span>
                                            <span className="font-semibold text-green-700">
                                                -{money(totals.difference)}
                                            </span>
                                        </div>
                                    ) : totals.difference < 0 ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-600">
                                                Additional charge
                                            </span>
                                            <span className="font-semibold text-blue-700">
                                                +{money(Math.abs(totals.difference))}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-600">
                                                Price adjustment
                                            </span>
                                            <span className="font-semibold text-neutral-700">
                                                No adjustment
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 flex justify-between text-sm text-neutral-500">
                                <span>Estimated profit</span>
                                <span
                                    className={
                                        totals.estimatedProfit < 0
                                            ? "font-medium text-red-600"
                                            : "font-medium text-neutral-900"
                                    }
                                >
                                    {money(totals.estimatedProfit)}
                                </span>
                            </div>

                            <div className="my-4 border-t border-neutral-200" />

                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-neutral-900">
                                    Final Bill Amount
                                </span>

                                <span className="text-2xl font-bold text-neutral-900">
                                    {money(totals.finalTotal)}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={createBill}
                                disabled={
                                    submitting ||
                                    cart.length === 0 ||
                                    !branchId
                                }
                                className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                            >
                                {submitting
                                    ? "Creating bill..."
                                    : "Confirm & Create Bill"}
                            </button>

                            <p className="mt-3 text-center text-xs text-neutral-400">
                                Stock will be deducted after confirmation.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
