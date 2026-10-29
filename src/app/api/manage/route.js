import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

async function isOwnerAuthenticated() {
    const cookieStore = await cookies();

    const token = cookieStore.get(
        getOwnerCookieName()
    )?.value;

    return await verifyOwnerSession(token);
}

const TABLES = {
    branches: "branches",
    categories: "categories",
    brands: "brands",
};

export async function GET(request) {
    if (!(await isOwnerAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized. Owner login required." },
            { status: 401 }
        );
    }

    try {
        const supabase = createAdminClient();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");

        if (!TABLES[type]) {
            return NextResponse.json(
                { error: "Invalid type" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from(TABLES[type])
            .select("*")
            .order("name", { ascending: true });

        if (error) {
            console.error("Management GET error:", error.message);

            return NextResponse.json(
                { error: "Unable to load management records." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            data: data || [],
        });
    } catch (error) {
        console.error("Management GET error:", error.message);

        return NextResponse.json(
            { error: "Something went wrong." },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    if (!(await isOwnerAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized. Owner login required." },
            { status: 401 }
        );
    }

    try {
        const supabase = createAdminClient();
        const body = await request.json();
        const { type, name } = body;

        if (!TABLES[type]) {
            return NextResponse.json(
                { error: "Invalid type" },
                { status: 400 }
            );
        }

        const cleanName =
            typeof name === "string" ? name.trim() : "";

        if (!cleanName || cleanName.length > 150) {
            return NextResponse.json(
                { error: "Name must contain 1–150 characters." },
                { status: 400 }
            );
        }

        const { data: existing, error: searchError } =
            await supabase
                .from(TABLES[type])
                .select("id, name, is_active")
                .ilike("name", cleanName);

        if (searchError) {
            throw searchError;
        }

        const duplicate = (existing || []).find(
            (item) =>
                item.name?.trim().toLowerCase() ===
                cleanName.toLowerCase()
        );

        if (duplicate) {
            if (!duplicate.is_active) {
                const { data, error } = await supabase
                    .from(TABLES[type])
                    .update({ is_active: true })
                    .eq("id", duplicate.id)
                    .select()
                    .single();

                if (error) {
                    throw error;
                }

                return NextResponse.json({
                    data,
                    restored: true,
                });
            }

            return NextResponse.json(
                { error: `${cleanName} already exists` },
                { status: 409 }
            );
        }

        const { data, error } = await supabase
            .from(TABLES[type])
            .insert({
                name: cleanName,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Management POST error:", error.message);

        return NextResponse.json(
            { error: "Unable to save management record." },
            { status: 500 }
        );
    }
}

export async function PATCH(request) {
    if (!(await isOwnerAuthenticated())) {
        return NextResponse.json(
            { error: "Unauthorized. Owner login required." },
            { status: 401 }
        );
    }

    try {
        const supabase = createAdminClient();
        const body = await request.json();

        const { type, id, name, isActive } = body;

        if (!TABLES[type]) {
            return NextResponse.json(
                { error: "Invalid type" },
                { status: 400 }
            );
        }

        if (typeof id !== "string" || !id.trim()) {
            return NextResponse.json(
                { error: "Valid ID is required." },
                { status: 400 }
            );
        }

        const updateData = {};

        if (typeof name === "string") {
            const cleanName = name.trim();

            if (!cleanName || cleanName.length > 150) {
                return NextResponse.json(
                    { error: "Name must contain 1–150 characters." },
                    { status: 400 }
                );
            }

            updateData.name = cleanName;
        }

        if (typeof isActive === "boolean") {
            updateData.is_active = isActive;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "Nothing to update" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from(TABLES[type])
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Management PATCH error:", error.message);

        return NextResponse.json(
            { error: "Unable to update management record." },
            { status: 500 }
        );
    }
}