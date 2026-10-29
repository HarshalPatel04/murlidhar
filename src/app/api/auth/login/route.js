import { NextResponse } from "next/server";
import {
    createOwnerSession,
    getOwnerCookieName,
    getOwnerSessionDuration,
} from "@/lib/auth";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request) {
    try {
        const { pin } = await request.json();

        const ownerPin = process.env.OWNER_PIN;

        if (!ownerPin) {
            return NextResponse.json(
                { error: "Owner PIN is not configured" },
                { status: 500 }
            );
        }

        if (
            typeof pin !== "string" ||
            pin.length !== ownerPin.length ||
            !constantTimeEqual(pin, ownerPin)
        ) {
            return NextResponse.json(
                { error: "Incorrect PIN" },
                { status: 401 }
            );
        }

        const token = await createOwnerSession();

        const response = NextResponse.json({
            success: true,
        });

        response.cookies.set({
            name: getOwnerCookieName(),
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: getOwnerSessionDuration(),
        });

        return response;
    } catch (error) {
        console.error("Owner login error:", error);

        return NextResponse.json(
            { error: "Unable to log in" },
            { status: 500 }
        );
    }
}

function constantTimeEqual(a, b) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
        return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
}