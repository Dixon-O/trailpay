"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { StateBadge } from "@/components/StateBadge";
import type { ContractListItem } from "@/lib/types";
import { fmtLocal, fmtUsd } from "@/lib/pricing";

export default function ParentPage() {
  const [items, setItems] = useState<ContractListItem[] | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/contracts")
        .then((r) => r.json())
        .then((j) => j.ok && setItems(j.data));
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your contracts</h1>
            <p className="mt-1 text-text-muted">Amina Wanjiku · Dubai 🇦🇪</p>
          </div>
          <Link
            href="/send"
            className="rounded-xl bg-accent px-5 py-2.5 font-medium text-[#1a1206] transition hover:brightness-110"
          >
            New contract
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {items === null && <Skeleton />}
          {items?.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center text-text-muted">
              No contracts yet.{" "}
              <Link href="/send" className="text-accent hover:underline">
                Lock your first term →
              </Link>
            </div>
          )}
          {items?.map(({ contract, school, legs }) => (
            <Link
              key={contract.id}
              href={`/parent/contract/${contract.id}`}
              className="glass block rounded-2xl p-5 transition hover:bg-white/[0.07]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{school?.logoEmoji}</span>
                  <div>
                    <div className="font-medium">{school?.name}</div>
                    <div className="text-xs text-text-muted">
                      {contract.beneficiaryName} · {contract.beneficiaryGrade} ·{" "}
                      <span className="tabular">{contract.shortCode}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <StateBadge state={contract.state} />
                  <div className="tabular mt-1 text-xs text-text-muted">
                    {fmtUsd(contract.senderAmount)} · {fmtLocal(contract.totalAmountLocal, contract.localCurrency)}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                {legs.map((l) => (
                  <div key={l.id} className="flex-1">
                    <div
                      className={`h-1.5 rounded-full ${
                        l.state === "settled"
                          ? "bg-success"
                          : l.state === "refunded" || l.state === "cancelled"
                            ? "bg-danger"
                            : l.state === "attested" || l.state === "released"
                              ? "bg-info"
                              : l.state === "window_open"
                                ? "bg-pending"
                                : "bg-white/10"
                      }`}
                    />
                    <div className="mt-1 text-[10px] text-text-muted">{l.milestoneLabel}</div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="glass h-28 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}
