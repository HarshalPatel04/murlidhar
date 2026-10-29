"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginPage() {
    const router = useRouter();
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ pin }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Login failed.");
                return;
            }

            router.replace("/manage");
            router.refresh();
        } catch {
            setError("Unable to connect. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-xl font-bold text-white">
                        M
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Owner Login
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Enter your PIN to manage inventory settings.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="owner-pin"
                            className="mb-2 block text-sm font-medium text-gray-700"
                        >
                            Owner PIN
                        </label>

                        <input
                            id="owner-pin"
                            type="password"
                            inputMode="numeric"
                            autoComplete="current-password"
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            placeholder="Enter your PIN"
                            required
                            autoFocus
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-200"
                        />
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !pin}
                        className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Verifying..." : "Unlock Management"}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-gray-400">
                    Murlidhar Inventory
                </p>
            </div>
        </main>
    );
}