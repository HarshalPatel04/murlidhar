import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

export async function GET() {
    const cookieStore = await cookies();

    const token = cookieStore.get(
        getOwnerCookieName()
    )?.value;

    const authenticated = await verifyOwnerSession(token);

    return NextResponse.json({
        authenticated,
    });
}