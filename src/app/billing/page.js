
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export default function BillingPage() {
    const [branches, setBranches] = useState([]);
    const [bills, setBills] = useState([]);

    const [branchId, setBranchId] = useState("");
    const [search, setSearch] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [downloadFrom, setDownloadFrom] = useState("");
    const [downloadTo, setDownloadTo] = useState("");

    const loadBranches = useCallback(async () => {
        const supabase = createClient();

        const { data, error } = await supabase
            .from("branches")
            .select("id, name")
            .eq("is_active", true)
            .order("name");

        if (error) throw error;

        setBranches(data || []);
    }, []);

    const loadBills = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();

            if (branchId) params.set("branchId", branchId);
            if (search.trim()) params.set("search", search.trim());
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const response = await fetch(
                `/api/bills?${params.toString()}`,
                { cache: "no-store" }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to load bills."
                );
            }

            setBills(result.data || []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Unable to load bills.");
        } finally {
            setLoading(false);
        }
    }, [branchId, search, from, to]);

    useEffect(() => {
        loadBranches().catch((err) => {
            console.error(err);
            setError("Unable to load branches.");
            setLoading(false);
        });
    }, [loadBranches]);

    useEffect(() => {
        loadBills();
    }, [loadBills]);

    const totalAmount = bills.reduce(
        (sum, bill) => sum + Number(bill.total_amount || 0),
        0
    );

    const downloadSalesHistory = () => {
        if (downloadFrom && downloadTo && downloadFrom > downloadTo) {
            alert("From date cannot be later than To date.");
            return;
        }

        const params = new URLSearchParams();

        params.set("export", "csv");

        if (branchId) params.set("branchId", branchId);
        if (search.trim()) params.set("search", search.trim());
        if (downloadFrom) params.set("from", downloadFrom);
        if (downloadTo) params.set("to", downloadTo);

        window.location.href = `/api/bills?${params.toString()}`;
    };

    return (
        <main className="min-h-screen bg-neutral-50">
            {/* HEADER */}
            <header className="border-b border-neutral-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
                    <Link
                        href="/"
                        className="text-lg font-semibold tracking-tight text-neutral-900"
                    >
                        Murlidhar Inventory
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
                        >
                            Inventory
                        </Link>

                        <Link
                            href="/manage"
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100"
                        >
                            Manage
                        </Link>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-7xl px-5 py-10">
                {/* PAGE TITLE */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                            Sales management
                        </p>

                        <h1 className="mt-2 text-3xl font-semibold text-neutral-900">
                            Billing
                        </h1>

                        <p className="mt-1 text-sm text-neutral-500">
                            Create bills and manage previous transactions.
                        </p>
                    </div>


                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-500">
                                Download From
                            </label>
                            <input
                                type="date"
                                value={downloadFrom}
                                onChange={(e) => setDownloadFrom(e.target.value)}
                                className="h-11 rounded-lg border border-neutral-300 px-3 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-medium text-neutral-500">
                                Download To
                            </label>
                            <input
                                type="date"
                                value={downloadTo}
                                min={downloadFrom || undefined}
                                onChange={(e) => setDownloadTo(e.target.value)}
                                className="h-11 rounded-lg border border-neutral-300 px-3 text-sm"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={downloadSalesHistory}
                            className="flex h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                            <span>↓</span>
                            Download History
                        </button>

                        <Link
                            href="/billing/new"
                            className="flex h-11 items-center rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700"
                        >
                            + Create New Bill
                        </Link>
                    </div>
                </div>

                {/* SUMMARY */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-neutral-200 bg-white p-5">
                        <p className="text-sm text-neutral-500">
                            Bills displayed
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-neutral-900">
                            {loading ? "—" : bills.length}
                        </p>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white p-5">
                        <p className="text-sm text-neutral-500">
                            Total bill value displayed
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-neutral-900">
                            {loading ? "—" : formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <input
                            type="text"
                            placeholder="Search bill / customer / phone"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-600"
                        />

                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-600"
                        >
                            <option value="">All branches</option>

                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
                        />

                        <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            min={from || undefined}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
                        />
                    </div>
                </div>

                {/* BILL HISTORY */}
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <div className="border-b border-neutral-200 px-5 py-4">
                        <h2 className="font-semibold text-neutral-900">
                            Sales History
                        </h2>
                    </div>

                    {error && (
                        <div className="p-6 text-sm text-red-600">
                            {error}
                            <button
                                type="button"
                                onClick={loadBills}
                                className="ml-3 underline"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="p-10 text-center text-sm text-neutral-500">
                            Loading bills...
                        </div>
                    )}

                    {!loading && !error && bills.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="font-medium text-neutral-700">
                                No bills found
                            </p>

                            <p className="mt-1 text-sm text-neutral-400">
                                Your completed bills will appear here.
                            </p>

                            <Link
                                href="/billing/new"
                                className="mt-4 inline-block text-sm font-medium underline"
                            >
                                Create your first bill
                            </Link>
                        </div>
                    )}

                    {!loading && !error && bills.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                                    <tr>
                                        <th className="px-5 py-3">Bill number</th>
                                        <th className="px-5 py-3">Customer</th>
                                        <th className="px-5 py-3">Branch</th>
                                        <th className="px-5 py-3">Date</th>
                                        <th className="px-5 py-3">Amount</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-neutral-100">
                                    {bills.map((bill) => (
                                        <tr key={bill.id} className="hover:bg-neutral-50">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-neutral-900">
                                                {bill.type === "manual_sale"
                                                    ? "Manual Sale"
                                                    : bill.bill_number}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-medium text-neutral-800">
                                                    {bill.customer_name || "Walk-in customer"}
                                                </p>

                                                <p className="text-xs text-neutral-400">
                                                    {bill.type === "manual_sale"
                                                        ? `Quantity: ${bill.quantity}`
                                                        : bill.customer_phone || "—"}
                                                </p>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                                                {bill.branch?.name || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-neutral-600">
                                                {formatDate(bill.bill_date)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-neutral-900">
                                                {bill.total_amount == null
                                                    ? "—"
                                                    : formatCurrency(bill.total_amount)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className={`rounded-full px-2.5 py-1 text-xs ${bill.type === "manual_sale"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : bill.status === "completed"
                                                        ? "bg-green-50 text-green-700"
                                                        : "bg-neutral-100 text-neutral-600"
                                                    }`}>
                                                    {bill.type === "manual_sale"
                                                        ? "Manual Sale"
                                                        : bill.status}
                                                </span>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
