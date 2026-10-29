"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InventorySearch from "@/components/search/InventorySearch";
import Image from "next/image";
import { getBranchImage } from "@/lib/images";

const branchImages = [
  "/branch/img1.png",
  "/branch/img2.png",
  "/branch/img3.png",
  "/branch/img4.png",
  "/branch/img5.png",
];

export default function HomePage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBranches() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error(error);
        setError("Unable to load branches.");
        setLoading(false);
        return;
      }

      setBranches(data || []);
      setLoading(false);
    }

    loadBranches();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50">

      <Link
        href="/inventory/add"
        className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white shadow-lg hover:bg-neutral-400"
      >
        <span className="text-xl leading-none">
          +
        </span>

        <span>Add Inventory</span>
      </Link>

      {/* HEADER */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight text-neutral-900"
          >
            Murlidhar Inventory
          </Link>

          {/* SEARCH PLACEHOLDER */}
          <div className="hidden flex-1 md:block">
            <div className="flex h-10 w-full items-center px-4 text-left text-sm text-neutral-400">
              <InventorySearch />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Branches
          </h1>

          <p className="mt-1 text-sm text-neutral-500">
            Select a branch to view its inventory.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-neutral-500">
            Loading branches...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          branches.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <p className="text-sm text-neutral-500">
                No branches added yet.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          branches.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => {
                const image = getBranchImage(branch);

                return (
                  <Link
                    key={branch.id}
                    href={`/branches/${branch.id}`}
                    className="group overflow-hidden w-76 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400"
                  >
                    <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={getBranchImage(branch)}
                        alt={branch.name}
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
                        className="object-cover"
                      />
                    </div>

                    <div className="p-5">
                      <h2 className="font-semibold text-2xl text-neutral-900">
                        {branch.name}
                      </h2>

                      {branch.address && (
                        <p className="mt-1 text-md text-neutral-500">
                          {branch.address}
                        </p>
                      )}

                      <p className="mt-4 text-md font-medium text-neutral-700">
                        View inventory →
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </section>
    </main>
  );
}