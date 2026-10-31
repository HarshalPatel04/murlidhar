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
    {
        key: "products",
        title: "Products",
        description: "Manage products and branch-wise stock",
    },
];

export default function ManagePage() {
    const [data, setData] = useState({
        branches: [],
        categories: [],
        brands: [],
        products: [],
    });

    const [productBranches, setProductBranches] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modal, setModal] = useState(null);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    // PRODUCT MANAGEMENT
    const [productModal, setProductModal] = useState(null);

    const [productForm, setProductForm] = useState({
        name: "",
        categoryId: "",
        brandId: "",
        branchId: "",
        allBranches: false,
        quantity: "0",
    });

    const [productSaving, setProductSaving] = useState(false);
    const [productSearch, setProductSearch] = useState("");

    const [editingStock, setEditingStock] = useState(null);
    const [stockQuantity, setStockQuantity] = useState("");

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

            // Load branches, categories and brands
            const managementSections = sections.filter(
                (section) => section.key !== "products"
            );

            const results = await Promise.all(
                managementSections.map(async (section) => {
                    const response = await fetch(
                        `/api/manage?type=${section.key}`,
                        { cache: "no-store" }
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

            // Load products and branch-wise inventory
            const productResponse = await fetch(
                "/api/manage/products",
                { cache: "no-store" }
            );

            const productResult = await productResponse.json();

            if (!productResponse.ok) {
                throw new Error(
                    productResult.error || "Failed to load products"
                );
            }

            setData({
                ...Object.fromEntries(results),
                products: productResult.data || [],
            });

            setProductBranches(
                (productResult.branches || []).filter(
                    (branch) => branch.is_active
                )
            );

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

    function openAddProductModal() {
        setProductForm({
            name: "",
            categoryId: "",
            brandId: "",
            branchId: productBranches[0]?.id || "",
            allBranches: false,
            quantity: "0",
        });

        setProductModal({
            mode: "add",
        });
    }

    function openEditProductModal(product) {
        setProductForm({
            name: product.name,
            categoryId: product.category_id,
            brandId: product.brand_id || "",
            branchId: "",
            allBranches: false,
            quantity: "0",
        });

        setProductModal({
            mode: "edit",
            product,
        });
    }

    async function saveProduct() {
        const cleanName = productForm.name.trim();
        const quantity = Number(productForm.quantity);

        if (
            !cleanName ||
            !productForm.categoryId ||
            !Number.isSafeInteger(quantity) ||
            quantity < 0
        ) {
            setError("Please enter valid product details and quantity.");
            return;
        }

        if (
            productModal.mode === "add" &&
            !productForm.allBranches &&
            !productForm.branchId
        ) {
            setError("Please select a branch.");
            return;
        }

        try {
            setProductSaving(true);
            setError("");

            const isEdit = productModal.mode === "edit";

            const response = await fetch(
                isEdit
                    ? "/api/manage/products"
                    : "/api/manage/products",
                {
                    method: isEdit ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        isEdit
                            ? {
                                action: "details",
                                productId: productModal.product.id,
                                name: cleanName,
                                categoryId: productForm.categoryId,
                                brandId: productForm.brandId || null,
                            }
                            : {
                                name: cleanName,
                                categoryId: productForm.categoryId,
                                brandId: productForm.brandId || null,
                                branchId: productForm.branchId,
                                allBranches: productForm.allBranches,
                                quantity,
                            }
                    ),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Unable to save product.");
            }

            setProductModal(null);
            await loadData();

        } catch (error) {
            console.error(error);
            setError(error.message || "Unable to save product.");
        } finally {
            setProductSaving(false);
        }
    }

    function openStockModal(product, branch) {
        setEditingStock({
            product,
            branch,
        });

        setStockQuantity(String(branch.quantity));
    }

    async function saveStock() {
        const quantity = Number(stockQuantity);

        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 0
        ) {
            setError("Enter a valid non-negative whole number.");
            return;
        }

        try {
            setProductSaving(true);
            setError("");

            const response = await fetch("/api/manage/products", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "stock",
                    productId: editingStock.product.id,
                    branchId: editingStock.branch.id,
                    quantity,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to update stock."
                );
            }

            setEditingStock(null);
            setStockQuantity("");

            await loadData();

        } catch (error) {
            console.error(error);
            setError(error.message || "Unable to update stock.");
        } finally {
            setProductSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f7f5] text-[#111]">
            <div className="mx-auto w-full max-w-[1400] px-5 py-6 md:px-8">

                {/* HEADER */}
                <header className="mb-8 flex items-center justify-between gap-4 border-b border-neutral-300 pb-4">
                    <a
                        href="/"
                        className="inline-flex text-md text-black/45 hover:text-black"
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
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

                    {sections.map((section) => {

                        // -----------------------------------------
                        // PRODUCTS CARD
                        // -----------------------------------------

                        if (section.key === "products") {
                            const products = (data.products || []).filter((product) => {
                                const search = productSearch.trim().toLowerCase();

                                if (!search) return true;

                                return (
                                    product.name?.toLowerCase().includes(search) ||
                                    product.category_name?.toLowerCase().includes(search) ||
                                    product.brand_name?.toLowerCase().includes(search)
                                );
                            });

                            return (
                                <section
                                    key={section.key}
                                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                                >

                                    {/* PRODUCTS HEADER */}
                                    <div className="border-b border-black/10 p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="text-lg font-semibold">
                                                    Products
                                                </h2>
                                                <p className="mt-1 text-xs text-black/45">
                                                    Manage products and branch-wise stock
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={openAddProductModal}
                                                className="shrink-0 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/80"
                                            >
                                                + Add
                                            </button>
                                        </div>

                                        {/* SEARCH PRODUCT */}
                                        <div className="relative mt-4">
                                            <svg
                                                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <circle cx="11" cy="11" r="7" />
                                                <path d="m20 20-4-4" />
                                            </svg>

                                            <input
                                                type="text"
                                                value={productSearch}
                                                onChange={(event) =>
                                                    setProductSearch(event.target.value)
                                                }
                                                placeholder="Search product..."
                                                className="h-10 w-full rounded-xl border border-black/10 bg-[#f8f8f7] pl-9 pr-9 text-sm outline-none transition placeholder:text-black/35 focus:border-black/30 focus:bg-white"
                                            />

                                            {productSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setProductSearch("")}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black/35 hover:text-black"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>


                                    <div className="max-h-[650px] space-y-3 overflow-y-auto p-3">

                                        {loading ? (
                                            <p className="px-2 py-5 text-sm text-black/40">
                                                Loading products...
                                            </p>
                                        ) : products.length === 0 ? (
                                            <p className="px-2 py-6 text-center text-sm text-black/40">
                                                {productSearch
                                                    ? `No products matching "${productSearch}"`
                                                    : "No products found."}
                                            </p>
                                        ) : (
                                            products.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className={`rounded-xl border border-black/10 p-3 ${!product.is_active ? "opacity-50" : ""
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-md font-semibold">
                                                                {product.name}
                                                            </h3>

                                                            <p className="mt-1 text-sm font-semibold text-black/64">
                                                                {product.category_name}
                                                                {product.brand_name
                                                                    ? ` · ${product.brand_name}`
                                                                    : ""}
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => openEditProductModal(product)}
                                                            className="shrink-0 rounded-lg px-2 py-1 text-xs text-black/55 bg-black/5 hover:bg-black/15 hover:text-black"
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
                                                        {product.branches
                                                            .filter((branch) => branch.is_active)
                                                            .map((branch) => (
                                                                <div
                                                                    key={branch.id}
                                                                    className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.025] px-2.5 py-2"
                                                                >
                                                                    <span className="truncate text-xs text-black/60">
                                                                        {branch.name}
                                                                    </span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openStockModal(product, branch)
                                                                        }
                                                                        disabled={!product.is_active}
                                                                        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold bg-black/3 hover:bg-black/15 disabled:cursor-not-allowed"
                                                                    >
                                                                        {branch.quantity} <span className="font-normal text-black/40 hover:text-black">· Edit</span>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                    </div>

                                                    {!product.is_active && (
                                                        <p className="mt-2 text-[10px] text-red-500">
                                                            Inactive product
                                                        </p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            );
                        }

                        // -----------------------------------------
                        // EXISTING BRANCHES / CATEGORIES / BRANDS
                        // -----------------------------------------

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
                                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                            >
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
                                            onClick={() => openAddModal(section.key)}
                                            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white transition hover:bg-black/80"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                </div>

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

                                                    <div className="ml-3 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(section.key, item)
                                                            }
                                                            className="rounded-lg px-2.5 py-1.5 text-xs text-black/55 bg-black/5 hover:bg-black/15 hover:text-black"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActive(section.key, item)
                                                            }
                                                            className="rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {inactiveItems.length > 0 && (
                                        <div className="mt-4 border-t border-black/10 pt-3">
                                            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/50">
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

                                                            <div className="mt-0.5 text-[11px] text-black/46">
                                                                Inactive
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleActive(section.key, item)
                                                            }
                                                            className="ml-3 rounded-lg px-2.5 py-1.5 text-xs text-black/55 hover:text-black bg-black/5 hover:bg-black/15"
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
                                className="rounded-xl px-4 py-2.5 text-sm text-black/55 bg-black/5 hover:bg-black/15"
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


            {/* ==========================================
                PRODUCT ADD / EDIT MODAL
                ========================================== */}

            {productModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setProductModal(null);
                        }
                    }}
                >
                    <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

                        <div className="mb-6">
                            <h2 className="text-xl font-semibold">
                                {productModal.mode === "add"
                                    ? "Add Product"
                                    : "Edit Product"}
                            </h2>

                            <p className="mt-1 text-sm text-black/45">
                                {productModal.mode === "add"
                                    ? "Add a product and assign its initial stock."
                                    : "Update product information."}
                            </p>
                        </div>

                        <div className="space-y-4">

                            {/* PRODUCT NAME */}
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-black/60">
                                    Product Name
                                </label>

                                <input
                                    autoFocus
                                    value={productForm.name}
                                    onChange={(event) =>
                                        setProductForm({
                                            ...productForm,
                                            name: event.target.value,
                                        })
                                    }
                                    placeholder="Enter product name"
                                    className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none focus:border-black/40"
                                />
                            </div>

                            {/* CATEGORY */}
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-black/60">
                                    Category
                                </label>

                                <select
                                    value={productForm.categoryId}
                                    onChange={(event) =>
                                        setProductForm({
                                            ...productForm,
                                            categoryId: event.target.value,
                                        })
                                    }
                                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/40"
                                >
                                    <option value="">Select category</option>

                                    {data.categories
                                        .filter((item) => item.is_active)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* BRAND */}
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-black/60">
                                    Brand
                                    <span className="ml-1 font-normal text-black/35">
                                        (Optional)
                                    </span>
                                </label>

                                <select
                                    value={productForm.brandId}
                                    onChange={(event) =>
                                        setProductForm({
                                            ...productForm,
                                            brandId: event.target.value,
                                        })
                                    }
                                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/40"
                                >
                                    <option value="">No brand</option>

                                    {data.brands
                                        .filter((item) => item.is_active)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* ADD MODE ONLY */}
                            {productModal.mode === "add" && (
                                <>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-black/60">
                                            Initial Quantity
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={productForm.quantity}
                                            onChange={(event) =>
                                                setProductForm({
                                                    ...productForm,
                                                    quantity: event.target.value,
                                                })
                                            }
                                            className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none focus:border-black/40"
                                        />
                                    </div>

                                    {/* BRANCH */}
                                    <div>
                                        <label className="mb-1.5 text-xs font-medium text-black/60">
                                            Add Stock To
                                        </label>

                                        <select
                                            value={
                                                productForm.allBranches
                                                    ? "all"
                                                    : productForm.branchId
                                            }
                                            onChange={(event) => {
                                                const value = event.target.value;

                                                setProductForm({
                                                    ...productForm,
                                                    allBranches: value === "all",
                                                    branchId:
                                                        value === "all" ? "" : value,
                                                });
                                            }}
                                            className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/40"
                                        >
                                            <option value="">Select branch</option>

                                            {productBranches.map((branch) => (
                                                <option
                                                    key={branch.id}
                                                    value={branch.id}
                                                >
                                                    {branch.name}
                                                </option>
                                            ))}

                                            <option value="all">
                                                All Branches
                                            </option>
                                        </select>

                                        <p className="mt-1.5 text-[11px] text-black/40">
                                            The same initial quantity will be added to
                                            every selected branch.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="mt-7 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setProductModal(null)}
                                disabled={productSaving}
                                className="rounded-xl px-4 py-2.5 text-sm text-black/55 bg-black/5 hover:bg-black/15"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveProduct}
                                disabled={
                                    productSaving ||
                                    !productForm.name.trim() ||
                                    !productForm.categoryId
                                }
                                className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {productSaving
                                    ? "Saving..."
                                    : productModal.mode === "add"
                                        ? "Add Product"
                                        : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==========================================
                EDIT STOCK MODAL
                ========================================== */}

            {editingStock && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setEditingStock(null);
                        }
                    }}
                >
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">

                        <h2 className="text-xl font-semibold">
                            Update Stock
                        </h2>

                        <p className="mt-1 text-sm text-black/45">
                            {editingStock.product.name}
                        </p>

                        <div className="mt-5 rounded-xl bg-black/[0.035] p-4">
                            <p className="text-xs text-black/45">
                                Branch
                            </p>

                            <p className="mt-1 text-sm font-medium">
                                {editingStock.branch.name}
                            </p>

                            <p className="mt-4 text-xs text-black/45">
                                Current Quantity
                            </p>

                            <p className="mt-1 text-2xl font-semibold tabular-nums">
                                {editingStock.branch.quantity}
                            </p>
                        </div>

                        <div className="mt-5">
                            <label className="mb-1.5 block text-xs font-medium text-black/60">
                                New Quantity
                            </label>

                            <input
                                type="number"
                                min="0"
                                step="1"
                                autoFocus
                                value={stockQuantity}
                                onChange={(event) =>
                                    setStockQuantity(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        saveStock();
                                    }
                                }}
                                className="h-12 w-full rounded-xl border border-black/10 px-4 text-lg font-semibold outline-none focus:border-black/40"
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingStock(null)}
                                disabled={productSaving}
                                className="rounded-xl px-4 py-2.5 text-sm text-black/55 bg-black/5 hover:bg-black/15"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveStock}
                                disabled={
                                    productSaving ||
                                    stockQuantity.trim() === "" ||
                                    !Number.isSafeInteger(Number(stockQuantity)) ||
                                    Number(stockQuantity) < 0
                                }
                                className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {productSaving ? "Updating..." : "Update Stock"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}