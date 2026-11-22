
// src/app/api/bills/products/route.js

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

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(getOwnerCookieName())?.value;

        if (!(await verifyOwnerSession(token))) {
            return NextResponse.json(
                { error: "Unauthorized." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId");
        const search = searchParams.get("search")?.trim() || "";

        if (!UUID.test(branchId || "")) {
            return NextResponse.json(
                { error: "Select a valid branch." },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data: branch, error: branchError } = await supabase
            .from("branches")
            .select("id, name")
            .eq("id", branchId)
            .eq("is_active", true)
            .maybeSingle();

        if (branchError) throw branchError;

        if (!branch) {
            return NextResponse.json(
                { error: "Branch not found or inactive." },
                { status: 404 }
            );
        }

        let productQuery = supabase
            .from("sub_products")
            .select(`
                id,
                product_id,
                name,
                image_url,
                purchase_price,
                selling_price
            `)
            .eq("is_active", true)
            .order("name")
            .limit(500);

        if (search) {
            productQuery = productQuery.ilike("name", `%${search}%`);
        }

        const { data: products, error: productError } =
            await productQuery;

        if (productError) throw productError;

        const productIds = (products || []).map((item) => item.id);

        if (productIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: [],
            });
        }

        const { data: inventory, error: inventoryError } =
            await supabase
                .from("sub_product_inventory")
                .select("sub_product_id, quantity")
                .eq("branch_id", branchId)
                .in("sub_product_id", productIds);

        if (inventoryError) throw inventoryError;

        const stockMap = new Map(
            (inventory || []).map((item) => [
                item.sub_product_id,
                Number(item.quantity || 0),
            ])
        );

        const result = (products || []).map((product) => ({
            id: product.id,
            productId: product.product_id,
            name: product.name,
            imageUrl: product.image_url,
            purchasePrice: Number(product.purchase_price || 0),
            sellingPrice: Number(product.selling_price || 0),
            stock: stockMap.get(product.id) || 0,
        }));

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error("Bill products GET:", error);

        return NextResponse.json(
            { error: "Unable to load sub-products." },
            { status: 500 }
        );
    }
}
