
// src/app/api/bills/branches/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(getOwnerCookieName())?.value;

        if (!(await verifyOwnerSession(token))) {
            return NextResponse.json(
                { error: "Unauthorized." },
                { status: 401 }
            );
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("branches")
            .select("id, name")
            .eq("is_active", true)
            .order("name");

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
        });
    } catch (error) {
        console.error("Bill branches GET:", error);

        return NextResponse.json(
            { error: "Unable to load branches." },
            { status: 500 }
        );
    }
}
