import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
    try {
        const { searchParams } =
            new URL(request.url);

        const type = searchParams.get("type");

        const supabase = await createClient();

        // -----------------------------------------
        // BRANCHES
        // -----------------------------------------

        if (type === "branches") {
            const { data, error } =
                await supabase
                    .from("branches")
                    .select("id, name")
                    .order("name");

            if (error) {
                throw error;
            }

            return NextResponse.json({
                items: data || [],
            });
        }

        // -----------------------------------------
        // CATEGORIES
        // -----------------------------------------

        if (type === "categories") {
            const { data, error } =
                await supabase
                    .from("categories")
                    .select("id, name")
                    .order("name");

            if (error) {
                throw error;
            }

            return NextResponse.json({
                items: data || [],
            });
        }

        // -----------------------------------------
        // BRANDS
        // -----------------------------------------

        if (type === "brands") {
            const { data, error } =
                await supabase
                    .from("brands")
                    .select("id, name")
                    .order("name");

            if (error) {
                throw error;
            }

            return NextResponse.json({
                items: data || [],
            });
        }

        // -----------------------------------------
        // PRODUCTS
        // -----------------------------------------

        if (type === "products") {
            const categoryId =
                searchParams.get(
                    "categoryId"
                );

            const brandId =
                searchParams.get("brandId");

            if (!categoryId || !brandId) {
                return NextResponse.json({
                    items: [],
                });
            }

            const { data, error } =
                await supabase
                    .from("products")
                    .select(
                        "id, name, image_url"
                    )
                    .eq(
                        "category_id",
                        categoryId
                    )
                    .eq(
                        "brand_id",
                        brandId
                    )
                    .eq("is_active", true)
                    .order("name");

            if (error) {
                throw error;
            }

            return NextResponse.json({
                items: data || [],
            });
        }

        return NextResponse.json(
            {
                error: "Invalid option type.",
            },
            {
                status: 400,
            }
        );
    } catch (error) {
        console.error(
            "Inventory options error:",
            error
        );

        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Unable to load options.",
            },
            {
                status: 500,
            }
        );
    }
}