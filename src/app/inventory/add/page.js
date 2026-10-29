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
        <main className="min-h-screen bg-neutral-50">
            <div className="mx-auto max-w-3xl px-5 py-8">
                {/* HEADER */}

                <div className="mb-8">
                    <button
                        type="button"
                        onClick={() =>
                            router.back()
                        }
                        className="mb-5 text-sm text-neutral-500 hover:text-neutral-900"
                    >
                        ← Back
                    </button>

                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                        Add Inventory
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        Add purchased stock to a branch.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-neutral-200 bg-white"
                >
                    <div className="p-6">
                        {/* BRANCH */}

                        <Field
                            number="01"
                            label="Branch"
                        >
                            <select
                                value={branchId}
                                onChange={(event) => {
                                    setBranchId(
                                        event.target.value
                                    );
                                    setCategoryId("");
                                    setBrandId("");
                                    setProductSearch("");
                                    setSelectedProduct(
                                        null
                                    );
                                }}
                                disabled={
                                    loadingBranches
                                }
                                className="select"
                            >
                                <option value="">
                                    {loadingBranches
                                        ? "Loading branches..."
                                        : "Select branch"}
                                </option>

                                {branches.map(
                                    (branch) => (
                                        <option
                                            key={
                                                branch.id
                                            }
                                            value={
                                                branch.id
                                            }
                                        >
                                            {branch.name}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>

                        {/* CATEGORY */}

                        <Field
                            number="02"
                            label="Category"
                        >
                            <select
                                value={categoryId}
                                onChange={(event) => {
                                    setCategoryId(
                                        event.target.value
                                    );
                                    setBrandId("");
                                    setProductSearch("");
                                    setSelectedProduct(
                                        null
                                    );
                                }}
                                disabled={
                                    !branchId ||
                                    loadingCategories
                                }
                                className="select"
                            >
                                <option value="">
                                    {!branchId
                                        ? "Select branch first"
                                        : loadingCategories
                                            ? "Loading categories..."
                                            : "Select category"}
                                </option>

                                {categories.map(
                                    (category) => (
                                        <option
                                            key={
                                                category.id
                                            }
                                            value={
                                                category.id
                                            }
                                        >
                                            {
                                                category.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>

                        {/* BRAND */}

                        <Field
                            number="03"
                            label="Brand"
                        >
                            <select
                                value={brandId}
                                onChange={(event) => {
                                    setBrandId(
                                        event.target.value
                                    );
                                    setProductSearch("");
                                    setSelectedProduct(
                                        null
                                    );
                                }}
                                disabled={
                                    !categoryId ||
                                    loadingBrands
                                }
                                className="select"
                            >
                                <option value="">
                                    {!categoryId
                                        ? "Select category first"
                                        : loadingBrands
                                            ? "Loading brands..."
                                            : "Select brand"}
                                </option>

                                {brands.map(
                                    (brand) => (
                                        <option
                                            key={
                                                brand.id
                                            }
                                            value={
                                                brand.id
                                            }
                                        >
                                            {brand.name}
                                        </option>
                                    )
                                )}
                            </select>
                        </Field>

                        {/* PRODUCT */}

                        <Field
                            number="04"
                            label="Product"
                        >
                            {!brandId ? (
                                <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-sm text-neutral-400">
                                    Select a brand first
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={
                                            productSearch
                                        }
                                        onChange={(
                                            event
                                        ) => {
                                            setProductSearch(
                                                event
                                                    .target
                                                    .value
                                            );
                                            setSelectedProduct(
                                                null
                                            );
                                        }}
                                        placeholder="Search or enter product name..."
                                        className="input"
                                    />

                                    {/* EXISTING PRODUCTS */}

                                    {productSearch.trim() && (
                                        <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                                            {loadingProducts ? (
                                                <div className="px-4 py-3 text-sm text-neutral-400">
                                                    Loading products...
                                                </div>
                                            ) : filteredProducts.length >
                                                0 ? (
                                                <div className="max-h-56 overflow-y-auto">
                                                    {filteredProducts.map(
                                                        (
                                                            product
                                                        ) => (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    product.id
                                                                }
                                                                onClick={() =>
                                                                    selectProduct(
                                                                        product
                                                                    )
                                                                }
                                                                className={`block w-full border-b border-neutral-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-neutral-50 ${selectedProduct?.id ===
                                                                        product.id
                                                                        ? "bg-neutral-50 font-medium"
                                                                        : ""
                                                                    }`}
                                                            >
                                                                {
                                                                    product.name
                                                                }
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-neutral-400">
                                                    No existing
                                                    product
                                                    found.
                                                </div>
                                            )}

                                            {/* CREATE */}

                                            {!exactProductExists &&
                                                !loadingProducts && (
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            createNewProduct
                                                        }
                                                        disabled={
                                                            creatingProduct
                                                        }
                                                        className="w-full border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                                                    >
                                                        {creatingProduct
                                                            ? "Creating product..."
                                                            : `+ Create "${productSearch.trim()}"`}
                                                    </button>
                                                )}
                                        </div>
                                    )}

                                    {/* SELECTED */}

                                    {selectedProduct && (
                                        <div className="mt-2 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                                            <div>
                                                <p className="text-xs text-neutral-400">
                                                    Selected
                                                </p>

                                                <p className="text-sm font-medium text-neutral-900">
                                                    {
                                                        selectedProduct.name
                                                    }
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedProduct(
                                                        null
                                                    )
                                                }
                                                className="text-xs text-neutral-500 hover:text-neutral-900"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Field>

                        {/* QUANTITY */}

                        <Field
                            number="05"
                            label="Quantity"
                        >
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(event) =>
                                    setQuantity(
                                        event.target.value
                                    )
                                }
                                className="input"
                            />
                        </Field>

                        {/* DATE */}

                        <Field
                            number="06"
                            label="Purchase date"
                        >
                            <input
                                type="date"
                                value={date}
                                onChange={(event) =>
                                    setDate(
                                        event.target.value
                                    )
                                }
                                className="input"
                            />
                        </Field>

                        {/* TIME */}

                        <Field
                            number="07"
                            label="Purchase time"
                        >
                            <input
                                type="time"
                                value={time}
                                onChange={(event) =>
                                    setTime(
                                        event.target.value
                                    )
                                }
                                className="input"
                            />
                        </Field>

                        {/* ERROR */}

                        {error && (
                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}

                    <div className="flex items-center justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-4">
                        <button
                            type="button"
                            onClick={() =>
                                router.back()
                            }
                            disabled={saving}
                            className="mr-3 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                !selectedProduct
                            }
                            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving
                                ? "Adding..."
                                : "Add Inventory"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function Field({
    number,
    label,
    children,
}) {
    return (
        <div className="border-b border-neutral-100 py-5 first:pt-0 last:border-b-0">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-center">
                <div>
                    <p className="text-[11px] font-medium tracking-wider text-neutral-400">
                        {number}
                    </p>

                    <p className="mt-1 text-sm font-medium text-neutral-800">
                        {label}
                    </p>
                </div>

                <div>{children}</div>
            </div>
        </div>
    );
}