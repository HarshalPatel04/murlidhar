import "server-only";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "murlidhar_owner_session";
const SESSION_DURATION = 8 * 60 * 60;

function getSecret() {
    const secret = process.env.OWNER_SESSION_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error(
            "OWNER_SESSION_SECRET must contain at least 32 characters"
        );
    }

    return new TextEncoder().encode(secret);
}

export async function createOwnerSession() {
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({
        role: "owner",
    })
        .setProtectedHeader({
            alg: "HS256",
        })
        .setIssuedAt(now)
        .setExpirationTime(now + SESSION_DURATION)
        .setIssuer("murlidhar-inventory")
        .setAudience("murlidhar-management")
        .sign(getSecret());
}

export async function verifyOwnerSession(token) {
    if (!token) {
        return false;
    }

    try {
        const { payload } = await jwtVerify(token, getSecret(), {
            issuer: "murlidhar-inventory",
            audience: "murlidhar-management",
            algorithms: ["HS256"],
        });

        return payload.role === "owner";
    } catch {
        return false;
    }
}

export function getOwnerCookieName() {
    return COOKIE_NAME;
}

export function getOwnerSessionDuration() {
    return SESSION_DURATION;
}