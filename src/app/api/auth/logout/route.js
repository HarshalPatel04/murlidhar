import { NextResponse } from "next/server";
import { getOwnerCookieName } from "@/lib/auth";

export async function POST() {
    const response = NextResponse.json({
        success: true,
    });

    response.cookies.set({
        name: getOwnerCookieName(),
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });

    return response;
}