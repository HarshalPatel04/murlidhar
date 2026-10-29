import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
    getOwnerCookieName,
    verifyOwnerSession,
} from "@/lib/auth";

import ManageClient from "./ManageClient";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
    const cookieStore = await cookies();

    const token = cookieStore.get(
        getOwnerCookieName()
    )?.value;

    const isOwner = await verifyOwnerSession(token);

    if (!isOwner) {
        redirect("/owner-login");
    }

    return <ManageClient />;
}