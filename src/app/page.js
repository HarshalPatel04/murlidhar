"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InventorySearch from "@/components/search/InventorySearch";
import Image from "next/image";
import { getBranchImage } from "@/lib/images";

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
        <div className="flex justify-around h-16 items-center">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight text-neutral-900"
          >
            Murlidhar Inventory
          </Link>

          {/* SEARCH PLACEHOLDER */}
          <div className="hidden md:block w-xl">
            <InventorySearch />
          </div>

          {/* MANAGE BUTTON */}
          <div>
            <Link
              href="/manage"
              className="border-2 rounded-lg p-2 hover:bg-neutral-800 hover:text-white"
            >
              Manage
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* SEARCH PLACEHOLDER */}
        <div className="md:hidden w-full mb-4">
          <InventorySearch />
        </div>

        <div className="mb-12 text-center">
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
            <div className="flex flex-wrap gap-20 justify-evenly">
              {branches.map((branch, index) => {
                const image = getBranchImage(branch, index);

                return (
                  <Link
                    key={branch.id}
                    href={`/branches/${branch.id}`}
                    className="group overflow-hidden w-76 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-transform hover:scale-105 shadow-lg hover:shadow-2xl"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={image}
                        alt={branch.name}
                        fill
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 300px"
                        className="object-fill p-5 bg-white transition-transform hover:scale-110"
                      />
                    </div>

                    <div className="p-5 border-t-2 border-neutral-300 mx-5 text-center">
                      <h2 className="font-semibold text-2xl text-neutral-900">
                        {branch.name}
                      </h2>

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