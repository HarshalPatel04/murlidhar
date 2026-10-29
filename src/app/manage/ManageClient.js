"use client";

import { useEffect, useState } from "react";

const sections = [
    {
        key: "branches",
        title: "Branches",
        description: "Manage your shop branches",
    },
    {
        key: "categories",
        title: "Categories",
        description: "Manage product categories",
    },
    {
        key: "brands",
        title: "Brands",
        description: "Manage product brands",
    },
];

export default function ManagePage() {
    const [data, setData] = useState({
        branches: [],
        categories: [],
        brands: [],
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modal, setModal] = useState(null);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
        } finally {
            window.location.replace("/owner-login");
        }
    }

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const results = await Promise.all(
                sections.map(async (section) => {
                    const response = await fetch(
                        `/api/manage?type=${section.key}`,
                        {
                            cache: "no-store",
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error || `Failed to load ${section.key}`
                        );
                    }

                    return [section.key, result.data || []];
                })
            );

            setData(Object.fromEntries(results));
        } catch (error) {
            console.error(error);
            setError(error.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function openAddModal(type) {
        setName("");
        setModal({
            mode: "add",
            type,
        });
    }

    function openEditModal(type, item) {
        setName(item.name);

        setModal({
            mode: "edit",
            type,
            item,
        });
    }

    async function saveItem() {
        const cleanName = name.trim();

        if (!cleanName) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            const response = await fetch("/api/manage", {
                method: modal.mode === "add" ? "POST" : "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    modal.mode === "add"
                        ? {
                            type: modal.type,
                            name: cleanName,
                        }
                        : {
                            type: modal.type,
                            id: modal.item.id,
                            name: cleanName,
                        }
                ),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to save"
                );
            }

            setModal(null);
            setName("");

            await loadData();
        } catch (error) {
            console.error(error);
            setError(error.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function toggleActive(type, item) {
        const action = item.is_active ? "deactivate" : "activate";

        const confirmed = window.confirm(
            `${action === "deactivate" ? "Deactivate" : "Activate"} "${item.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            const response = await fetch("/api/manage", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type,
                    id: item.id,
                    isActive: !item.is_active,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || `Failed to ${action}`
                );
            }

            await loadData();
        } catch (error) {
            console.error(error);
            setError(error.message || `Failed to ${action}`);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f7f5] text-[#111]">
            <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">

                {/* HEADER */}
                <header className="mb-8 flex items-center justify-between gap-4">
                    <a
                        href="/"
                        className="mb-3 inline-flex text-sm text-black/45 hover:text-black"
                    >
                        ← Back
                    </a>

                    <h1 className="text-3xl font-semibold tracking-tight">
                        Manage
                    </h1>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                        Logout
                    </button>
                    
                </header>

                {/* ERROR */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}



                {/* SECTIONS */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {sections.map((section) => {
                        const items = data[section.key] || [];

                        const activeItems = items.filter(
                            (item) => item.is_active
                        );

                        const inactiveItems = items.filter(
                            (item) => !item.is_active
                        );

                        return (
                            <section
                                key={section.key}
                                className="rounded-2xl border border-black/10 bg-white"
                            >
                                {/* SECTION HEADER */}
                                <div className="border-b border-black/10 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-semibold">
                                                {section.title}
                                            </h2>

                                            <p className="mt-1 text-xs text-black/45">
                                                {section.description}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                openAddModal(section.key)
                                            }
                                            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-black/80"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

                                {/* ITEMS */}
                                <div className="p-3">
                                    {loading ? (
                                        <div className="px-2 py-5 text-sm text-black/40">
                                            Loading...
                                        </div>
                                    ) : activeItems.length === 0 ? (
                                        <div className="px-2 py-5 text-sm text-black/40">
                                            No active {section.title.toLowerCase()}.
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {activeItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="group flex items-center justify-between rounded-xl px-3 py-3 hover:bg-black/[0.035]"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium">
                                                            {item.name}
                                                        </div>

                                                        <div className="mt-0.5 text-[11px] text-black/35">
                                                            Active
                                                        </div>
                                                    </div>

                                                    <div className="ml-3 flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    section.key,
                                                                    item
                                                                )
                                                            }
                                                            className="rounded-lg px-2.5 py-1.5 text-xs text-black/55 hover:bg-black/5 hover:text-black"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActive(
                                                                    section.key,
                                                                    item
                                                                )
                                                            }
                                                            className="rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* INACTIVE */}
                                    {inactiveItems.length > 0 && (
                                        <div className="mt-4 border-t border-black/10 pt-3">
                                            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30">
                                                Inactive
                                            </div>

                                            <div className="space-y-1">
                                                {inactiveItems.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between rounded-xl px-3 py-3 opacity-60"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm">
                                                                {item.name}
                                                            </div>

                                                            <div className="mt-0.5 text-[11px] text-black/35">
                                                                Inactive
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActive(
                                                                    section.key,
                                                                    item
                                                                )
                                                            }
                                                            className="ml-3 rounded-lg px-2.5 py-1.5 text-xs text-black/55 hover:bg-black/5 hover:text-black"
                                                        >
                                                            Activate
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* MODAL */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setModal(null);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5">
                            <h2 className="text-xl font-semibold">
                                {modal.mode === "add"
                                    ? `Add ${modal.type.slice(0, -1)}`
                                    : `Edit ${modal.type.slice(0, -1)}`}
                            </h2>

                            <p className="mt-1 text-sm text-black/45">
                                Enter a name below.
                            </p>
                        </div>

                        <input
                            autoFocus
                            value={name}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    saveItem();
                                }

                                if (event.key === "Escape") {
                                    setModal(null);
                                }
                            }}
                            placeholder="Name"
                            className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm outline-none transition focus:border-black/30 focus:bg-white"
                        />

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className="rounded-xl px-4 py-2.5 text-sm text-black/55 hover:bg-black/5"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveItem}
                                disabled={saving || !name.trim()}
                                className="rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}