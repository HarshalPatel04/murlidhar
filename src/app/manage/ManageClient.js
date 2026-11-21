"use client";

import { useEffect, useState } from "react";

const sections = [
    { key: "branches", title: "Branches", description: "Manage your shop branches" },
    { key: "categories", title: "Categories", description: "Manage product categories" },
    { key: "brands", title: "Brands", description: "Manage product brands" },
    { key: "products", title: "Products", description: "Manage products and branch-wise stock" },
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

    // SUB-PRODUCT MANAGEMENT
    const [subProductParent, setSubProductParent] = useState("");
    const [subProducts, setSubProducts] = useState([]);
    const [subProductBranches, setSubProductBranches] = useState([]);
    const [subProductLoading, setSubProductLoading] = useState(false);
    const [subProductSaving, setSubProductSaving] = useState(false);
    const [showSubProductForm, setShowSubProductForm] = useState(false);
    const [subProductForm, setSubProductForm] = useState({
        name: "",
        imageUrl: "",
        branchId: "",
        allBranches: false,
        quantity: "0",
    });
    const [editingSubProduct, setEditingSubProduct] = useState(null);
    const [editingSubProductStock, setEditingSubProductStock] = useState(null);
    const [subProductStockForm, setSubProductStockForm] = useState({
        type: "purchase",
        quantity: "1",
        date: new Date().toLocaleDateString("en-CA"),
        time: new Date().toTimeString().slice(0, 5),
    });
    const [subProductStockSaving, setSubProductStockSaving] = useState(false);

    const [editingStock, setEditingStock] = useState(null);
    const [stockQuantity, setStockQuantity] = useState("");

    async function handleLogout() {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            window.location.replace("/owner-login");
        }
    }

    async function loadData() {
        try {
            setLoading(true);
            setError("");

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

    async function loadSubProducts(productId) {
        if (!productId) {
            setSubProducts([]);
            setSubProductBranches([]);
            return;
        }

        try {
            setSubProductLoading(true);
            setError("");

            const response = await fetch(
                `/api/manage/sub-products?productId=${productId}`,
                { cache: "no-store" }
            );
            const responseText = await response.text();

            let result = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                throw new Error(
                    `Invalid API response (${response.status}).`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error || `Request failed (${response.status}).`
                );
            }
            
            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to load sub-products."
                );
            }

            setSubProducts(result.data || []);
            setSubProductBranches(
                (result.branches || []).filter(
                    (branch) => branch.is_active
                )
            );
        } catch (error) {
            console.error("Load sub-products:", error);
            setError(error.message || "Failed to load sub-products.");
        } finally {
            setSubProductLoading(false);
        }
    }

    function openAddSubProductModal() {
        setSubProductForm({
            name: "",
            imageUrl: "",
            branchId: subProductBranches[0]?.id || "",
            allBranches: false,
            quantity: "0",
        });
        setEditingSubProduct(null);
        setShowSubProductForm(true);
    }

    async function saveSubProduct() {
        const cleanName = subProductForm.name.trim();
        const quantity = Number(subProductForm.quantity);
        const isEditing = Boolean(editingSubProduct);

        if (!subProductParent) {
            setError("Please select a parent product.");
            return;
        }

        if (!cleanName) {
            setError("Please enter a sub-product name.");
            return;
        }

        if (!cleanName || !productForm.categoryId) {
            setError("Please enter valid product details.");
            return;
        }

        if (
            !isEditing &&
            !subProductForm.allBranches &&
            !subProductForm.branchId
        ) {
            setError("Please select a branch.");
            return;
        }

        try {
            setSubProductSaving(true);
            setError("");

            const response = await fetch("/api/manage/sub-products", {
                method: isEditing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    isEditing
                        ? {
                            action: "details",
                            subProductId: editingSubProduct.id,
                            name: cleanName,
                            imageUrl: subProductForm.imageUrl.trim() || null,
                            isActive: editingSubProduct.is_active,
                        }
                        : {
                            productId: subProductParent,
                            name: cleanName,
                            imageUrl: subProductForm.imageUrl.trim() || null,
                            branchId: subProductForm.branchId,
                            allBranches: subProductForm.allBranches,
                            quantity,
                        }
                ),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Unable to save sub-product."
                );
            }

            setShowSubProductForm(false);
            setEditingSubProduct(null);
            await loadSubProducts(subProductParent);
        } catch (error) {
            console.error("Save sub-product:", error);
            setError(error.message || "Unable to save sub-product.");
        } finally {
            setSubProductSaving(false);
        }
    }

    function openSubProductStockModal(item, branch) {
        setEditingSubProductStock({
            subProduct: item,
            branch,
        });

        setSubProductStockForm({
            type: "purchase",
            quantity: "1",
            date: new Date().toLocaleDateString("en-CA"),
            time: new Date().toTimeString().slice(0, 5),
        });
    }

    async function saveSubProductStock() {
        if (!editingSubProductStock || subProductStockSaving) return;

        const quantity = Number(subProductStockForm.quantity);

        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            setError("Please enter a valid quantity.");
            return;
        }

        if (!subProductStockForm.date || !subProductStockForm.time) {
            setError("Please select both date and time.");
            return;
        }

        const transactionDate = new Date(
            `${subProductStockForm.date}T${subProductStockForm.time}:00`
        );

        if (Number.isNaN(transactionDate.getTime())) {
            setError("Please enter a valid date and time.");
            return;
        }

        setSubProductStockSaving(true);
        setError("");

        try {
            const response = await fetch(
                "/api/inventory/sub-product-transaction",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        branchId: editingSubProductStock.branch.id,
                        subProductId: editingSubProductStock.subProduct.id,
                        type: subProductStockForm.type,
                        quantity,
                        transactionAt: transactionDate.toISOString(),
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Failed to record stock transaction."
                );
            }

            setEditingSubProductStock(null);

            await loadSubProducts(subProductParent);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setSubProductStockSaving(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function openAddModal(type) {
        setName("");
        setModal({ mode: "add", type });
    }

    function openEditModal(type, item) {
        setName(item.name);
        setModal({ mode: "edit", type, item });
    }

    async function saveItem() {
        const cleanName = name.trim();
        if (!cleanName) return;

        try {
            setSaving(true);
            setError("");

            const response = await fetch("/api/manage", {
                method: modal.mode === "add" ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    modal.mode === "add"
                        ? { type: modal.type, name: cleanName }
                        : {
                            type: modal.type,
                            id: modal.item.id,
                            name: cleanName,
                        }
                ),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to save");
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

        if (!confirmed) return;

        try {
            setError("");

            const response = await fetch("/api/manage", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    id: item.id,
                    isActive: !item.is_active,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${action}`);
            }

            await loadData();
        } catch (error) {
            console.error(error);
            setError(error.message || `Failed to ${action}`);
        }
    }

    // PRODUCT MANAGEMENT

    function openAddProductModal() {
        setProductForm({
            name: "",
            categoryId: "",
            brandId: "",
            branchId: productBranches[0]?.id || "",
            allBranches: false,
            quantity: "0",
        });

        setProductModal({ mode: "add" });
    }



    async function openEditProductModal(product) {
        setProductForm({
            name: product.name,
            categoryId: product.category_id,
            brandId: product.brand_id || "",
            branchId: "",
            allBranches: false,
            quantity: "0",
        });

        setProductModal({ mode: "edit", product });

        // Load this parent's sub-products
        setSubProductParent(product.id);
        setShowSubProductForm(false);
        setEditingSubProduct(null);

        await loadSubProducts(product.id);
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

            const response = await fetch("/api/manage/products", {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
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
                            quantity: 0,
                        }
                ),
            });

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

    // PRODUCT STOCK MANAGEMENT

    function openStockModal(product, branch) {
        setEditingStock({ product, branch });
        setStockQuantity(String(branch.quantity));
    }

    async function saveStock() {
        const quantity = Number(stockQuantity);

        if (!Number.isSafeInteger(quantity) || quantity < 0) {
            setError("Enter a valid non-negative whole number.");
            return;
        }

        try {
            setProductSaving(true);
            setError("");

            const response = await fetch("/api/manage/products", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "stock",
                    productId: editingStock.product.id,
                    branchId: editingStock.branch.id,
                    quantity,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Unable to update stock.");
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
            <div className="mx-auto w-full max-w-[1400px] px-5 py-6 md:px-8">

                {/* HEADER */}
                <header className="mb-8 flex items-center justify-between gap-4 border-b border-neutral-300 pb-4">
                    <a
                        href="/"
                        className="text-sm text-black/45 hover:text-black"
                    >
                        ← Back
                    </a>

                    <h1 className="text-3xl font-semibold tracking-tight">
                        Manage
                    </h1>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Logout
                    </button>
                </header>

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* MANAGEMENT SECTIONS */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

                    {sections.map((section) => {
                        if (section.key === "products") {
                            const products = (data.products || []).filter(
                                (product) => {
                                    const search = productSearch.trim().toLowerCase();

                                    if (!search) return true;

                                    return (
                                        product.name?.toLowerCase().includes(search) ||
                                        product.category_name?.toLowerCase().includes(search) ||
                                        product.brand_name?.toLowerCase().includes(search)
                                    );
                                }
                            );

                            return (
                                <section
                                    key={section.key}
                                    className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                                >
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

                                        <input
                                            type="text"
                                            value={productSearch}
                                            onChange={(event) =>
                                                setProductSearch(event.target.value)
                                            }
                                            placeholder="Search product..."
                                            className="mt-4 h-10 w-full rounded-xl border border-black/10 bg-[#f8f8f7] px-4 text-sm outline-none focus:border-black/30"
                                        />
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
                                            products.map((product) => {

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={`rounded-xl border border-black/10 p-3 ${!product.is_active ? "opacity-50" : ""
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <h3 className="truncate font-semibold">
                                                                    {product.name}
                                                                </h3>

                                                                <p className="mt-1 text-xs text-black/50">
                                                                    {product.category_name}
                                                                    {product.brand_name
                                                                        ? ` · ${product.brand_name}`
                                                                        : ""}
                                                                </p>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEditProductModal(product)
                                                                }
                                                                className="shrink-0 rounded-lg bg-black/5 px-2 py-1 text-xs hover:bg-black/15"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>

                                                        <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
                                                            {(product.branches || [])
                                                                .filter((branch) => branch.is_active)
                                                                .map((branch) => (
                                                                    <div
                                                                        key={branch.id}
                                                                        className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.025] px-2.5 py-2"
                                                                    >
                                                                        <span className="truncate text-xs text-black/60">
                                                                            {branch.name}
                                                                        </span>

                                                                        <span className="shrink-0 rounded-md bg-black/5 px-2 py-1 text-xs font-semibold tabular-nums">
                                                                            {branch.quantity}
                                                                        </span>

                                                                    </div>
                                                                ))}
                                                        </div>

                                                        {!product.is_active && (
                                                            <p className="mt-2 text-[10px] text-red-500">
                                                                Inactive product
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>
                            );
                        }

                        const items = data[section.key] || [];

                        return (
                            <section
                                key={section.key}
                                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
                            >
                                <div className="flex items-start justify-between gap-3 border-b border-black/10 p-5">
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
                                        className="shrink-0 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-black/80"
                                    >
                                        + Add
                                    </button>
                                </div>

                                <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
                                    {loading ? (
                                        <p className="px-2 py-5 text-sm text-black/40">
                                            Loading...
                                        </p>
                                    ) : items.length === 0 ? (
                                        <p className="px-2 py-6 text-center text-sm text-black/40">
                                            No {section.title.toLowerCase()} found.
                                        </p>
                                    ) : (
                                        items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3 ${!item.is_active ? "opacity-50" : ""
                                                    }`}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-black/40">
                                                        {item.is_active ? "Active" : "Inactive"}
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(section.key, item)
                                                        }
                                                        className="rounded-lg bg-black/5 px-2.5 py-1.5 text-xs hover:bg-black/10"
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleActive(section.key, item)
                                                        }
                                                        className="rounded-lg bg-black/5 px-2.5 py-1.5 text-xs hover:bg-black/10"
                                                    >
                                                        {item.is_active ? "Disable" : "Enable"}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* ADD / EDIT BRANCH, CATEGORY, BRAND MODAL */}
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
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") saveItem();
                                if (event.key === "Escape") setModal(null);
                            }}
                            placeholder="Name"
                            className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm outline-none focus:border-black/30"
                        />

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setModal(null)}
                                className="rounded-xl bg-black/5 px-4 py-2.5 text-sm text-black/55 hover:bg-black/10"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveItem}
                                disabled={saving || !name.trim()}
                                className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                            >
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT PRODUCT MODAL */}
            {productModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/35 px-4 py-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setProductModal(null);
                        }
                    }}
                >
                    <div className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
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
                                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm"
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

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-black/60">
                                    Brand (Optional)
                                </label>
                                <select
                                    value={productForm.brandId}
                                    onChange={(event) =>
                                        setProductForm({
                                            ...productForm,
                                            brandId: event.target.value,
                                        })
                                    }
                                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm"
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
                        </div>


                        {/* SUB-PRODUCTS MANAGER - EDIT MODE ONLY */}
                        {productModal.mode === "edit" && (
                            <div className="mt-6 border-t border-black/10 pt-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-semibold">
                                            Sub-Products
                                        </h3>
                                        <p className="mt-1 text-xs text-black/45">
                                            Manage variants and branch-wise stock
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={openAddSubProductModal}
                                        disabled={subProductLoading}
                                        className="shrink-0 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-40"
                                    >
                                        + Add Sub-Product
                                    </button>
                                </div>

                                {subProductLoading ? (
                                    <p className="py-6 text-center text-sm text-black/40">
                                        Loading sub-products...
                                    </p>
                                ) : subProducts.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-black/15 py-7 text-center">
                                        <p className="text-sm text-black/50">
                                            No sub-products found.
                                        </p>
                                        <p className="mt-1 text-xs text-black/35">
                                            Add your first variant using the button above.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {subProducts.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`rounded-xl border p-4 ${item.is_active
                                                    ? "border-black/10"
                                                    : "border-red-200 bg-red-50/40"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-semibold">
                                                            {item.name}
                                                        </h4>
                                                        <p className={`mt-1 text-xs ${item.is_active
                                                            ? "text-green-600"
                                                            : "text-red-500"
                                                            }`}>
                                                            {item.is_active ? "Active" : "Inactive"}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingSubProduct(item);
                                                            setSubProductForm({
                                                                name: item.name,
                                                                imageUrl: item.image_url || "",
                                                                branchId: "",
                                                                allBranches: false,
                                                                quantity: "0",
                                                            });
                                                            setShowSubProductForm(true);
                                                        }}
                                                        className="shrink-0 rounded-lg bg-black/5 px-3 py-1.5 text-xs hover:bg-black/10"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>

                                                <div className="mt-4 space-y-2 border-t border-black/5 pt-3">
                                                    {(item.branches || [])
                                                        .filter((branch) => branch.is_active)
                                                        .map((branch) => (
                                                            <div
                                                                key={branch.id}
                                                                className="flex items-center justify-between gap-2 text-sm"
                                                            >
                                                                <span className="text-xs text-black/55">
                                                                    {branch.name}
                                                                </span>

                                                                {item.is_active ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openSubProductStockModal(item, branch)
                                                                        }
                                                                        className="rounded-lg bg-black/5 px-2.5 py-1.5 text-xs font-semibold tabular-nums hover:bg-black/10"
                                                                    >
                                                                        {branch.quantity} · Edit
                                                                    </button>
                                                                ) : (
                                                                    <span className="px-2.5 py-1.5 text-xs font-semibold tabular-nums text-black/40">
                                                                        {branch.quantity}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-7 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setProductModal(null)}
                                disabled={productSaving}
                                className="rounded-xl bg-black/5 px-4 py-2.5 text-sm text-black/55"
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
                                className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
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

            {/* UPDATE PRODUCT STOCK MODAL */}
            {editingStock && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setEditingStock(null);
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-xl font-semibold">
                            Update Stock
                        </h2>

                        <p className="mt-1 text-sm text-black/45">
                            {editingStock.product.name} · {editingStock.branch.name}
                        </p>

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
                                className="h-11 w-full rounded-xl border border-black/10 px-4 text-sm outline-none focus:border-black/40"
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingStock(null)}
                                disabled={productSaving}
                                className="rounded-xl bg-black/5 px-4 py-2.5 text-sm text-black/60"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveStock}
                                disabled={productSaving}
                                className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {productSaving ? "Saving..." : "Update Stock"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT SUB-PRODUCT MODAL */}
            {showSubProductForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    {editingSubProduct
                                        ? "Edit Sub-Product"
                                        : "Add Sub-Product"}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Parent: {
                                        data.products.find(
                                            (product) => product.id === subProductParent
                                        )?.name
                                    }
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowSubProductForm(false);
                                    setEditingSubProduct(null);
                                }}
                                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Sub-Product Name
                                </label>
                                <input
                                    type="text"
                                    value={subProductForm.name}
                                    onChange={(event) =>
                                        setSubProductForm((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                        }))
                                    }
                                    placeholder="e.g. Plain, Unique, Girls"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                                />
                            </div>

                            {!editingSubProduct && (
                                <>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="sub-all-branches"
                                            type="checkbox"
                                            checked={subProductForm.allBranches}
                                            onChange={(event) =>
                                                setSubProductForm((prev) => ({
                                                    ...prev,
                                                    allBranches: event.target.checked,
                                                }))
                                            }
                                        />
                                        <label
                                            htmlFor="sub-all-branches"
                                            className="text-sm text-gray-700"
                                        >
                                            Add to all branches
                                        </label>
                                    </div>

                                    {!subProductForm.allBranches && (
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                                Branch
                                            </label>
                                            <select
                                                value={subProductForm.branchId}
                                                onChange={(event) =>
                                                    setSubProductForm((prev) => ({
                                                        ...prev,
                                                        branchId: event.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-xl border border-gray-300 px-4 py-3"
                                            >
                                                <option value="">Select branch</option>
                                                {subProductBranches.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Initial Quantity
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={subProductForm.quantity}
                                            onChange={(event) =>
                                                setSubProductForm((prev) => ({
                                                    ...prev,
                                                    quantity: event.target.value,
                                                }))
                                            }
                                            className="w-full rounded-xl border border-gray-300 px-4 py-3"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSubProductForm(false);
                                    setEditingSubProduct(null);
                                }}
                                className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveSubProduct}
                                disabled={subProductSaving}
                                className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {subProductSaving
                                    ? "Saving..."
                                    : editingSubProduct
                                        ? "Update Sub-Product"
                                        : "Create Sub-Product"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-PRODUCT STOCK TRANSACTION MODAL */}
            {editingSubProductStock && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

                        <div className="mb-5">
                            <h2 className="text-xl font-bold text-black">
                                Record Stock Transaction
                            </h2>

                            <p className="mt-1 text-sm text-black/50">
                                {editingSubProductStock.subProduct.name}
                                {" · "}
                                {editingSubProductStock.branch.name}
                            </p>
                        </div>

                        {/* TRANSACTION TYPE */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-black">
                                Transaction Type
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSubProductStockForm((prev) => ({
                                            ...prev,
                                            type: "purchase",
                                        }))
                                    }
                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${subProductStockForm.type === "purchase"
                                        ? "border-green-600 bg-green-50 text-green-700"
                                        : "border-black/10 text-black/60"
                                        }`}
                                >
                                    Purchase (+)
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSubProductStockForm((prev) => ({
                                            ...prev,
                                            type: "sale",
                                        }))
                                    }
                                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${subProductStockForm.type === "sale"
                                        ? "border-red-600 bg-red-50 text-red-700"
                                        : "border-black/10 text-black/60"
                                        }`}
                                >
                                    Sale (-)
                                </button>
                            </div>
                        </div>

                        {/* QUANTITY */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-black">
                                Quantity
                            </label>

                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={subProductStockForm.quantity}
                                onChange={(e) =>
                                    setSubProductStockForm((prev) => ({
                                        ...prev,
                                        quantity: e.target.value,
                                    }))
                                }
                                placeholder="Enter quantity"
                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
                            />
                        </div>

                        {/* DATE */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-black">
                                Transaction Date
                            </label>

                            <input
                                type="date"
                                value={subProductStockForm.date}
                                onChange={(e) =>
                                    setSubProductStockForm((prev) => ({
                                        ...prev,
                                        date: e.target.value,
                                    }))
                                }
                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
                            />
                        </div>

                        {/* TIME */}
                        <div className="mb-5">
                            <label className="mb-2 block text-sm font-semibold text-black">
                                Transaction Time
                            </label>

                            <input
                                type="time"
                                value={subProductStockForm.time}
                                onChange={(e) =>
                                    setSubProductStockForm((prev) => ({
                                        ...prev,
                                        time: e.target.value,
                                    }))
                                }
                                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black"
                            />
                        </div>

                        {/* ACTIONS */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingSubProductStock(null)}
                                disabled={subProductStockSaving}
                                className="flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveSubProductStock}
                                disabled={subProductStockSaving}
                                className="flex-1 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-black/80 disabled:opacity-50"
                            >
                                {subProductStockSaving ? "Saving..." : "Save Transaction"}
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </main>
    );
}