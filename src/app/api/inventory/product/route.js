import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        // Verify owner session before accessing the database.
        const cookieStore = await cookies();

        const token = cookieStore.get(
            getOwnerCookieName()
        )?.value;

        const isOwner = await verifyOwnerSession(token);

        if (!isOwner) {
            return NextResponse.json(
                {
                    error: "Unauthorized. Owner login required.",
                },
                { status: 401 }
            );
        }

        const body = await request.json();

        const { name, categoryId, brandId } = body;
        const productName = name?.trim();

        if (!productName) {
            return NextResponse.json(
                { error: "Product name is required." },
                { status: 400 }
            );
        }

        if (!categoryId || !brandId) {
            return NextResponse.json(
                {
                    error: "Category and brand are required.",
                },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Verify the selected category and brand are active.
        const [
            { data: category, error: categoryError },
            { data: brand, error: brandError },
        ] = await Promise.all([
            supabase
                .from("categories")
                .select("id")
                .eq("id", categoryId)
                .eq("is_active", true)
                .maybeSingle(),

            supabase
                .from("brands")
                .select("id")
                .eq("id", brandId)
                .eq("is_active", true)
                .maybeSingle(),
        ]);

        if (categoryError || brandError) {
            throw categoryError || brandError;
        }

        if (!category || !brand) {
            return NextResponse.json(
                {
                    error: "The selected category or brand is inactive or does not exist.",
                },
                { status: 400 }
            );
        }

        // Check for an existing active product.
        const { data: existingProducts, error: searchError } =
            await supabase
                .from("products")
                .select("id, name, image_url, category_id, brand_id")
                .eq("category_id", categoryId)
                .eq("brand_id", brandId)
                .eq("is_active", true)
                .ilike("name", productName);

        if (searchError) {
            throw searchError;
        }

        const existingProduct = existingProducts?.find(
            (product) =>
                product.name.trim().toLowerCase() ===
                productName.toLowerCase()
        );

        if (existingProduct) {
            return NextResponse.json({
                product: existingProduct,
                created: false,
            });
        }

        // Create the product.
        const { data: product, error: insertError } =
            await supabase
                .from("products")
                .insert({
                    name: productName,
                    category_id: categoryId,
                    brand_id: brandId,
                    image_url: null,
                    is_active: true,
                })
                .select("id, name, image_url, category_id, brand_id")
                .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({
            product,
            created: true,
        });
    } catch (error) {
        console.error("Create product error:", error.message);

        return NextResponse.json(
            { error: "Unable to create product." },
            { status: 500 }
        );
    }
}