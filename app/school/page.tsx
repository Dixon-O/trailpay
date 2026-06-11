"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import type { School } from "@/lib/db/schema";
import { fmtLocal } from "@/lib/pricing";

export default function SchoolListPage() {
  const [schools, setSchools] = useState<School[]>([]);
  useEffect(() => {
    fetch("/api/schools")
      .then((r) => r.json())
      .then((j) => j.ok && setSchools(j.data));
  }, []);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">School portals</h1>
        <p className="mt-1 text-text-muted">
          Open a school&apos;s portal to confirm enrollment and release the term&apos;s locked fees.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {schools.map((s) => (
            <Link
              key={s.id}
              href={`/school/${s.id}`}
              className="glass flex items-center gap-3 rounded-2xl p-5 transition hover:bg-white/[0.07]"
            >
              <span className="text-3xl">{s.logoEmoji}</span>
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-text-muted">
                  {s.city}, {s.country} · Paybill {s.paybillNumber} ·{" "}
                  {fmtLocal(s.termFeeLocal, s.localCurrency)}/term
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
