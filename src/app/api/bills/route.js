
// src/app/api/bills/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function isAuthorizedOwner() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getOwnerCookieName())?.value;
    return await verifyOwnerSession(token);
}



// GET: Combined bill and manual-sale history + CSV export
export async function GET(request) {
    try {
        if (!(await isAuthorizedOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search")?.trim() || "";
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const branchId = searchParams.get("branchId");
        const exportCsv = searchParams.get("export") === "csv";

        if (branchId && !UUID.test(branchId)) {
            return NextResponse.json(
                { error: "Invalid branch ID." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Validate date filters
        let fromDate = null;
        let toDate = null;

        if (from) {
            fromDate = new Date(from);

            if (Number.isNaN(fromDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid start date." },
                    { status: 400 }
                );
            }
        }

        if (to) {
            toDate = new Date(to);

            if (Number.isNaN(toDate.getTime())) {
                return NextResponse.json(
                    { error: "Invalid end date." },
                    { status: 400 }
                );
            }

            toDate.setHours(23, 59, 59, 999);
        }

        const safeSearch = search.replace(/[,%()]/g, " ").trim();

        // Build a fresh query for each page
        function buildBillQuery() {
            let query = supabase
                .from("bills")
                .select(`
                    id,
                    bill_number,
                    branch_id,
                    customer_name,
                    customer_phone,
                    subtotal,
                    total_amount,
                    status,
                    bill_date,
                    created_at,
                    branch:branches (
                        id,
                        name
                    )
                `)
                .order("bill_date", { ascending: false });

            if (branchId) {
                query = query.eq("branch_id", branchId);
            }

            if (fromDate) {
                query = query.gte("bill_date", fromDate.toISOString());
            }

            if (toDate) {
                query = query.lte("bill_date", toDate.toISOString());
            }

            if (safeSearch) {
                query = query.or(
                    `bill_number.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%,customer_phone.ilike.%${safeSearch}%`
                );
            }

            return query;
        }

        function buildManualQuery() {
            let query = supabase
                .from("sub_product_transactions")
                .select(`
                    id,
                    branch_id,
                    sub_product_id,
                    quantity,
                    transaction_total,
                    transaction_at,
                    sub_product:sub_products (
                        id,
                        name
                    ),
                    branch:branches (
                        id,
                        name
                    )
                `)
                .eq("type", "sale")
                .is("bill_item_id", null)
                .order("transaction_at", { ascending: false });

            if (branchId) {
                query = query.eq("branch_id", branchId);
            }

            if (fromDate) {
                query = query.gte(
                    "transaction_at",
                    fromDate.toISOString()
                );
            }

            if (toDate) {
                query = query.lte(
                    "transaction_at",
                    toDate.toISOString()
                );
            }

            return query;
        }

        // Fetch every page for CSV; normal dashboard remains limited to 200
        async function fetchAllPages(buildQuery) {
            const pageSize = 1000;
            let allRows = [];
            let offset = 0;

            while (true) {
                const { data, error } = await buildQuery()
                    .range(offset, offset + pageSize - 1);

                if (error) throw error;

                const rows = data || [];
                allRows = allRows.concat(rows);

                if (rows.length < pageSize) break;

                offset += pageSize;
            }

            return allRows;
        }

        let bills;
        let manualSales;

        if (exportCsv) {
            [bills, manualSales] = await Promise.all([
                fetchAllPages(buildBillQuery),
                fetchAllPages(buildManualQuery),
            ]);
        } else {
            const [
                { data: billData, error: billError },
                { data: manualData, error: manualError },
            ] = await Promise.all([
                buildBillQuery().limit(200),
                buildManualQuery().limit(200),
            ]);

            if (billError) throw billError;
            if (manualError) throw manualError;

            bills = billData || [];
            manualSales = manualData || [];
        }

        const normalizedBills = bills.map((bill) => ({
            id: bill.id,
            type: "Bill",
            reference: bill.bill_number || "",
            name: bill.customer_name || "Walk-in customer",
            detail: bill.customer_phone || "",
            branch: bill.branch?.name || "",
            date: bill.bill_date,
            quantity: "",
            amount: bill.total_amount,
            status: bill.status || "",
        }));

        const normalizedManualSales = manualSales
            .filter((sale) => {
                if (!safeSearch) return true;

                return (
                    sale.sub_product?.name
                        ?.toLowerCase()
                        .includes(safeSearch.toLowerCase()) || false
                );
            })
            .map((sale) => ({
                id: sale.id,
                type: "Manual Sale",
                reference: "Manual Sale",
                name: sale.sub_product?.name || "Unknown product",
                detail: "",
                branch: sale.branch?.name || "",
                date: sale.transaction_at,
                quantity: Number(sale.quantity || 0),
                amount: sale.transaction_total,
                status: "Manual Sale",
            }));

        const combined = [
            ...normalizedBills,
            ...normalizedManualSales,
        ].sort(
            (a, b) =>
                new Date(b.date).getTime() -
                new Date(a.date).getTime()
        );

        if (exportCsv) {
            const headers = [
                "Type",
                "Reference",
                "Customer / Product",
                "Phone",
                "Branch",
                "Date",
                "Quantity",
                "Amount (INR)",
                "Status",
            ];

            function escapeCsv(value) {
                let text = value == null ? "" : String(value);

                // Prevent spreadsheet formula injection
                if (/^[=+\-@\t\r]/.test(text)) {
                    text = "'" + text;
                }

                return `"${text.replace(/"/g, '""')}"`;
            }

            const rows = combined.map((item) => [
                item.type,
                item.reference,
                item.name,
                item.detail,
                item.branch,
                item.date
                    ? new Date(item.date).toLocaleString("en-IN")
                    : "",
                item.quantity,
                item.amount,
                item.status,
            ]);

            const csv = [
                headers,
                ...rows,
            ]
                .map((row) => row.map(escapeCsv).join(","))
                .join("\r\n");

            const filename = `murlidhar-sales-history-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;

            return new Response("\uFEFF" + csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        // Keep existing dashboard response shape
        const dashboardData = [
            ...bills.map((bill) => ({
                ...bill,
                type: "bill",
                date: bill.bill_date,
            })),
            ...manualSales
                .filter((sale) => {
                    if (!search) return true;

                    const productName =
                        sale.sub_product?.name?.toLowerCase() || "";

                    return productName.includes(search.toLowerCase());
                })
                .map((sale) => {
                    const quantity = Number(sale.quantity || 0);
                    const amount =
                        sale.transaction_total == null
                            ? null
                            : Number(sale.transaction_total);

                    return {
                        id: `manual-${sale.id}`,
                        type: "manual_sale",
                        bill_number: "Manual Sale",
                        branch_id: sale.branch_id,
                        customer_name:
                            sale.sub_product?.name || "Unknown product",
                        customer_phone: `Quantity: ${quantity}`,
                        subtotal: amount,
                        total_amount: amount,
                        transaction_total: amount,
                        status: "Manual Sale",
                        bill_date: sale.transaction_at,
                        created_at: sale.transaction_at,
                        date: sale.transaction_at,
                        branch: sale.branch,
                        sub_product_id: sale.sub_product_id,
                        quantity,
                    };
                }),
        ]
            .sort(
                (a, b) =>
                    new Date(b.date).getTime() -
                    new Date(a.date).getTime()
            )
            .slice(0, 200);

        return NextResponse.json({
            success: true,
            data: dashboardData,
        });
    } catch (error) {
        console.error("Bills GET:", error);

        return NextResponse.json(
            { error: "Unable to load bill history." },
            { status: 500 }
        );
    }
}

// POST: Create bill and deduct stock atomically
export async function POST(request) {
    try {
        if (!(await isAuthorizedOwner())) {
            return NextResponse.json(
                { error: "Unauthorized. Owner login required." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            branchId,
            customerName,
            customerPhone,
            items,
            billDate,
            negotiatedTotal,
        } = body;

        if (!UUID.test(branchId || "")) {
            return NextResponse.json(
                { error: "Please select a valid branch." },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Add at least one item to the bill." },
                { status: 400 }
            );
        }

        if (items.length > 100) {
            return NextResponse.json(
                { error: "A bill cannot contain more than 100 items." },
                { status: 400 }
            );
        }

        if (
            customerName != null &&
            typeof customerName !== "string"
        ) {
            return NextResponse.json(
                { error: "Invalid customer name." },
                { status: 400 }
            );
        }

        if (
            customerPhone != null &&
            typeof customerPhone !== "string"
        ) {
            return NextResponse.json(
                { error: "Invalid customer phone." },
                { status: 400 }
            );
        }

        let parsedBillDate = null;

        if (billDate) {
            const date = new Date(billDate);

            if (Number.isNaN(date.getTime())) {
                return NextResponse.json(
                    { error: "Invalid bill date." },
                    { status: 400 }
                );
            }

            parsedBillDate = date.toISOString();
        }

        const rpcItems = [];

        for (const item of items) {
            const subProductId = item?.subProductId;
            const quantity = item?.quantity;

            if (!UUID.test(subProductId || "")) {
                return NextResponse.json(
                    { error: "Invalid sub-product in bill." },
                    { status: 400 }
                );
            }

            if (
                !Number.isSafeInteger(quantity) ||
                quantity <= 0
            ) {
                return NextResponse.json(
                    {
                        error: "Item quantity must be a positive whole number.",
                    },
                    { status: 400 }
                );
            }

            rpcItems.push({
                sub_product_id: subProductId,
                quantity,
            });
        }

        const supabase = createAdminClient();

        const finalTotal = Number(negotiatedTotal);

        if (
            !Number.isFinite(finalTotal) ||
            finalTotal < 0 ||
            Math.round(finalTotal * 100) !== finalTotal * 100
        ) {
            return NextResponse.json(
                { error: "Enter a valid negotiated grand total." },
                { status: 400 }
            );
        }

        const rpcArgs = {
            p_branch_id: branchId,
            p_items: rpcItems,
            p_customer_name: customerName?.trim() || null,
            p_customer_phone: customerPhone?.trim() || null,
            p_negotiated_total: finalTotal,
        };

        if (parsedBillDate) {
            rpcArgs.p_bill_date = parsedBillDate;
        }

        const { data, error } = await supabase.rpc(
            "create_bill",
            rpcArgs
        );

        if (error) {
            console.error("Create bill RPC:", error);

            return NextResponse.json(
                { error: error.message || "Unable to create bill." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            bill: data,
        });
    } catch (error) {
        console.error("Bills POST:", error);

        return NextResponse.json(
            { error: "Unable to create bill." },
            { status: 500 }
        );
    }
}
