"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddInventoryPage() {
    const router = useRouter();

    const [branches, setBranches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [products, setProducts] = useState([]);

    const [branchId, setBranchId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [brandId, setBrandId] = useState("");

    // Product input
    const [productSearch, setProductSearch] = useState("");
    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [creatingProduct, setCreatingProduct] =
        useState(false);

    const [quantity, setQuantity] = useState("1");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const [loadingBranches, setLoadingBranches] =
        useState(true);

    const [loadingCategories, setLoadingCategories] =
        useState(false);

    const [loadingBrands, setLoadingBrands] =
        useState(false);

    const [loadingProducts, setLoadingProducts] =
        useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // -----------------------------------------
    // DEFAULT DATE + TIME
    // -----------------------------------------

    useEffect(() => {
        const now = new Date();

        setDate(
            [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0"),
            ].join("-")
        );

        setTime(
            [
                String(now.getHours()).padStart(2, "0"),
                String(now.getMinutes()).padStart(2, "0"),
            ].join(":")
        );
    }, []);

    // -----------------------------------------
    // LOAD BRANCHES
    // -----------------------------------------

    useEffect(() => {
        async function loadBranches() {
            try {
                const response = await fetch(
                    "/api/inventory/options?type=branches"
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to load branches."
                    );
                }

                setBranches(data.items || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoadingBranches(false);
            }
        }

        loadBranches();
    }, []);

    // -----------------------------------------
    // LOAD CATEGORIES
    // -----------------------------------------

    useEffect(() => {
        if (!branchId) {
            setCategories([]);
            setCategoryId("");
            return;
        }

        async function loadCategories() {
            setLoadingCategories(true);
            setError("");

            try {
                const response = await fetch(
                    "/api/inventory/options?type=categories"
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to load categories."
                    );
                }

                setCategories(data.items || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoadingCategories(false);
            }
        }

        loadCategories();
    }, [branchId]);

    // -----------------------------------------
    // LOAD BRANDS
    // -----------------------------------------

    useEffect(() => {
        if (!categoryId) {
            setBrands([]);
            setBrandId("");
            return;
        }

        async function loadBrands() {
            setLoadingBrands(true);
            setError("");

            try {
                const response = await fetch(
                    "/api/inventory/options?type=brands"
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to load brands."
                    );
                }

                setBrands(data.items || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoadingBrands(false);
            }
        }

        loadBrands();
    }, [categoryId]);

    // -----------------------------------------
    // LOAD PRODUCTS
    // -----------------------------------------

    useEffect(() => {
        if (!brandId || !categoryId) {
            setProducts([]);
            setProductSearch("");
            setSelectedProduct(null);
            return;
        }

        async function loadProducts() {
            setLoadingProducts(true);
            setError("");

            try {
                const params = new URLSearchParams();

                params.set("type", "products");
                params.set(
                    "categoryId",
                    categoryId
                );
                params.set(
                    "brandId",
                    brandId
                );

                const response = await fetch(
                    `/api/inventory/options?${params.toString()}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to load products."
                    );
                }

                setProducts(data.items || []);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoadingProducts(false);
            }
        }

        loadProducts();
    }, [brandId, categoryId]);

    // -----------------------------------------
    // PRODUCT SEARCH
    // -----------------------------------------

    const normalizedSearch =
        productSearch.trim().toLowerCase();

    const filteredProducts =
        normalizedSearch
            ? products.filter((product) =>
                product.name
                    .toLowerCase()
                    .includes(normalizedSearch)
            )
            : products;

    const exactProductExists =
        products.some(
            (product) =>
                product.name.trim().toLowerCase() ===
                normalizedSearch
        );

    // -----------------------------------------
    // SELECT EXISTING PRODUCT
    // -----------------------------------------

    function selectProduct(product) {
        setSelectedProduct(product);
        setProductSearch(product.name);
        setError("");
    }

    // -----------------------------------------
    // CREATE NEW PRODUCT
    // -----------------------------------------

    async function createNewProduct() {
        const name = productSearch.trim();

        if (!name) {
            return;
        }

        if (!categoryId || !brandId) {
            setError(
                "Select category and brand first."
            );
            return;
        }

        if (exactProductExists) {
            const existing = products.find(
                (product) =>
                    product.name
                        .trim()
                        .toLowerCase() ===
                    name.toLowerCase()
            );

            if (existing) {
                selectProduct(existing);
            }

            return;
        }

        setCreatingProduct(true);
        setError("");

        try {
            const response = await fetch(
                "/api/inventory/product",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        categoryId,
                        brandId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to create product."
                );
            }

            const newProduct = data.product;

            setProducts((current) => [
                ...current,
                newProduct,
            ]);

            setSelectedProduct(newProduct);
            setProductSearch(newProduct.name);
        } catch (error) {
            setError(error.message);
        } finally {
            setCreatingProduct(false);
        }
    }

    // -----------------------------------------
    // SUBMIT INVENTORY
    // -----------------------------------------

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        const quantityValue = Number(quantity);

        if (!branchId) {
            setError("Select a branch.");
            return;
        }

        if (!categoryId) {
            setError("Select a category.");
            return;
        }

        if (!brandId) {
            setError("Select a brand.");
            return;
        }

        if (!selectedProduct) {
            setError(
                "Select an existing product or create a new product."
            );
            return;
        }

        if (
            !Number.isInteger(quantityValue) ||
            quantityValue <= 0
        ) {
            setError(
                "Quantity must be a whole number greater than zero."
            );
            return;
        }

        if (!date || !time) {
            setError("Select date and time.");
            return;
        }

        const transactionDate = new Date(
            `${date}T${time}`
        );

        if (
            Number.isNaN(
                transactionDate.getTime()
            )
        ) {
            setError("Invalid date or time.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(
                "/api/inventory/transaction",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        branchId,
                        productId:
                            selectedProduct.id,
                        type: "purchase",
                        quantity: quantityValue,
                        transactionAt:
                            transactionDate.toISOString(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Unable to add inventory."
                );
            }

            router.push(
                `/branches/${branchId}/category/${categoryId}/brand/${brandId}`
            );
        } catch (error) {
            setError(
                error.message ||
                "Unable to add inventory."
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 text-neutral-900 sm:px-6 sm:py-10">
            <div className="mx-auto max-w-4xl">

                {/* HEADER */}
                <header className="mb-8">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950"
                    >
                        <span aria-hidden="true">←</span>
                        Back
                    </button>

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Inventory management
                            </div>

                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                Add inventory
                            </h1>

                            <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-500">
                                Record newly purchased stock and add it to
                                the selected branch.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-lg">
                                +
                            </div>
                            <div>
                                <p className="text-xs text-neutral-500">
                                    Transaction type
                                </p>
                                <p className="mt-0.5 text-sm font-semibold">
                                    Stock purchase
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* FORM */}
                <form
                    onSubmit={handleSubmit}
                    className="overflow-visible rounded-2xl border border-neutral-200 bg-white shadow-sm"
                >
                    {/* FORM HEADER */}
                    <div className="border-b border-neutral-200 px-5 py-5 sm:px-8">
                        <h2 className="text-base font-semibold">
                            Purchase details
                        </h2>
                        <p className="mt-1 text-sm text-neutral-500">
                            Complete the details below to update your stock.
                        </p>
                    </div>

                    <div className="space-y-8 p-5 sm:p-8">

                        {/* SECTION 1 */}
                        <section>
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
                                    1
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        Product information
                                    </h3>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        Choose where the stock belongs.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">

                                {/* BRANCH */}
                                <Field label="Branch" required>
                                    <select
                                        value={branchId}
                                        onChange={(event) => {
                                            setBranchId(event.target.value);
                                            setCategoryId("");
                                            setBrandId("");
                                            setProductSearch("");
                                            setSelectedProduct(null);
                                        }}
                                        disabled={loadingBranches}
                                        className="form-select"
                                    >
                                        <option value="">
                                            {loadingBranches
                                                ? "Loading branches..."
                                                : "Select a branch"}
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
                                </Field>

                                {/* CATEGORY */}
                                <Field label="Category" required>
                                    <select
                                        value={categoryId}
                                        onChange={(event) => {
                                            setCategoryId(event.target.value);
                                            setBrandId("");
                                            setProductSearch("");
                                            setSelectedProduct(null);
                                        }}
                                        disabled={!branchId || loadingCategories}
                                        className="form-select"
                                    >
                                        <option value="">
                                            {!branchId
                                                ? "Select a branch first"
                                                : loadingCategories
                                                    ? "Loading categories..."
                                                    : "Select a category"}
                                        </option>

                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                {/* BRAND */}
                                <Field label="Brand" required>
                                    <select
                                        value={brandId}
                                        onChange={(event) => {
                                            setBrandId(event.target.value);
                                            setProductSearch("");
                                            setSelectedProduct(null);
                                        }}
                                        disabled={!categoryId || loadingBrands}
                                        className="form-select"
                                    >
                                        <option value="">
                                            {!categoryId
                                                ? "Select a category first"
                                                : loadingBrands
                                                    ? "Loading brands..."
                                                    : "Select a brand"}
                                        </option>

                                        {brands.map((brand) => (
                                            <option
                                                key={brand.id}
                                                value={brand.id}
                                            >
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                {/* PRODUCT */}
                                <Field label="Product" required>
                                    {!brandId ? (
                                        <div className="flex min-h-12 items-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 text-sm text-neutral-400">
                                            Select a brand first
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={productSearch}
                                                onChange={(event) => {
                                                    setProductSearch(
                                                        event.target.value
                                                    );
                                                    setSelectedProduct(null);
                                                }}
                                                placeholder="Search or enter product name"
                                                className="form-input"
                                            />

                                            {productSearch.trim() && (
                                                <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                                                    {loadingProducts ? (
                                                        <div className="px-4 py-4 text-sm text-neutral-500">
                                                            Loading products...
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {filteredProducts.length > 0 ? (
                                                                <div className="max-h-52 overflow-y-auto">
                                                                    {filteredProducts.map(
                                                                        (product) => (
                                                                            <button
                                                                                type="button"
                                                                                key={product.id}
                                                                                onClick={() =>
                                                                                    selectProduct(product)
                                                                                }
                                                                                className={`flex w-full items-center justify-between border-b border-neutral-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-neutral-50 ${selectedProduct?.id === product.id
                                                                                        ? "bg-neutral-50 font-semibold"
                                                                                        : ""
                                                                                    }`}
                                                                            >
                                                                                <span>
                                                                                    {product.name}
                                                                                </span>

                                                                                <span className="text-xs text-neutral-400">
                                                                                    Select →
                                                                                </span>
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <p className="px-4 py-3 text-sm text-neutral-500">
                                                                    No existing product found.
                                                                </p>
                                                            )}

                                                            {!exactProductExists && (
                                                                <button
                                                                    type="button"
                                                                    onClick={createNewProduct}
                                                                    disabled={creatingProduct}
                                                                    className="w-full border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
                                                                >
                                                                    {creatingProduct
                                                                        ? "Creating product..."
                                                                        : `+ Create "${productSearch.trim()}"`}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {selectedProduct && (
                                                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                                                            Selected product
                                                        </p>
                                                        <p className="mt-1 truncate text-sm font-semibold text-neutral-900">
                                                            {selectedProduct.name}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProduct(null);
                                                            setProductSearch("");
                                                        }}
                                                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-600 hover:bg-white"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Field>
                            </div>
                        </section>

                        {/* SECTION 2 */}
                        <section className="border-t border-neutral-100 pt-7">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
                                    2
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        Stock quantity
                                    </h3>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        Enter the number of units purchased.
                                    </p>
                                </div>
                            </div>

                            <div className="max-w-sm">
                                <Field label="Quantity" required>
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={quantity}
                                        onChange={(event) =>
                                            setQuantity(event.target.value)
                                        }
                                        placeholder="Enter quantity"
                                        className="form-input"
                                    />
                                    <p className="mt-2 text-xs text-neutral-400">
                                        Enter a whole number greater than zero.
                                    </p>
                                </Field>
                            </div>
                        </section>

                        {/* SECTION 3 */}
                        <section className="border-t border-neutral-100 pt-7">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
                                    3
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        Purchase date & time
                                    </h3>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                        Record when the stock was purchased.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Purchase date" required>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(event) =>
                                            setDate(event.target.value)
                                        }
                                        className="form-input"
                                    />
                                </Field>

                                <Field label="Purchase time" required>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(event) =>
                                            setTime(event.target.value)
                                        }
                                        className="form-input"
                                    />
                                </Field>
                            </div>
                        </section>

                        {/* ERROR */}
                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                <p className="font-semibold">
                                    Unable to add inventory
                                </p>
                                <p className="mt-1">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="flex flex-col-reverse gap-3 rounded-b-2xl border-t border-neutral-200 bg-neutral-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                        <p className="text-xs text-neutral-500">
                            Fields marked <span className="text-red-500">*</span> are required.
                        </p>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                disabled={saving}
                                className="min-h-11 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving || !selectedProduct}
                                className="min-h-11 rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {saving ? "Adding inventory..." : "Add inventory"}
                            </button>
                        </div>
                    </div>
                </form>

                <p className="mt-5 text-center text-xs text-neutral-400">
                    Review the branch, product, and quantity before saving.
                </p>
            </div>

            {/* FORM CONTROL STYLES */}
            <style jsx>{`
                .form-select,
                .form-input {
                    display: block;
                    width: 100%;
                    min-height: 48px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background-color: #ffffff;
                    padding: 0 14px;
                    color: #171717;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 150ms ease,
                        box-shadow 150ms ease;
                }

                .form-select {
                    cursor: pointer;
                }

                .form-select:focus,
                .form-input:focus {
                    border-color: #737373;
                    box-shadow: 0 0 0 3px rgb(23 23 23 / 7%);
                }

                .form-select:disabled,
                .form-input:disabled {
                    cursor: not-allowed;
                    background-color: #f5f5f5;
                    color: #a3a3a3;
                }

                .form-input::placeholder {
                    color: #a3a3a3;
                }
            `}</style>
        </main>
    );
}

function Field({ label, required = false, children }) {
    return (
        <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
                {label}
                {required && (
                    <span className="ml-1 text-red-500">*</span>
                )}
            </label>

            {children}
        </div>
    );
}