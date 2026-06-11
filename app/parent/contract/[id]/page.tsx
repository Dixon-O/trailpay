"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { StateBadge } from "@/components/StateBadge";
import { LegTimeline } from "@/components/LegTimeline";
import { useContractStream } from "@/hooks/useContractStream";
import { fmtLocal, fmtUsd } from "@/lib/pricing";
import type { Leg } from "@/lib/db/schema";

export default function ContractDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = useContractStream(id);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(legId: string, action: "dispute" | "cancel") {
    setBusy(legId + action);
    await fetch(`/api/legs/${legId}/${action}`, { method: "POST" });
    setBusy(null);
  }

  if (!data || !data.contract) {
    return (
      <>
        <Nav />
        <main className="mx-auto max-w-3xl flex-1 px-5 py-20 text-center text-text-muted">
          Loading contract…
        </main>
      </>
    );
  }

  const { contract, school, legs } = data;
  const settledLegs = legs.filter((l) => l.state === "settled");
  const refundedLegs = legs.filter((l) => l.state === "refunded");

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <Link href="/parent" className="text-sm text-text-muted hover:text-text">
          ← All contracts
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{school?.logoEmoji}</span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{school?.name}</h1>
              <p className="text-sm text-text-muted">
                {contract.beneficiaryName} · {contract.beneficiaryGrade} ·{" "}
                <span className="tabular">{contract.shortCode}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <StateBadge state={contract.state} />
            <div className="tabular mt-1 text-sm text-text-muted">
              {fmtUsd(contract.senderAmount)} paid ·{" "}
              {fmtLocal(contract.totalAmountLocal, contract.localCurrency)} locked
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Delivered to school" value={fmtLocal(settledLegs.reduce((a, l) => a + l.amountLocal, 0), contract.localCurrency)} tone="success" />
          <Stat label="Refunded to you" value={fmtLocal(refundedLegs.reduce((a, l) => a + l.amountLocal, 0), contract.localCurrency)} tone="danger" />
          <Stat label="Still locked" value={fmtLocal(legs.filter((l) => !["settled", "refunded", "cancelled"].includes(l.state)).reduce((a, l) => a + l.amountLocal, 0), contract.localCurrency)} tone="muted" />
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-medium">Terms</h2>
          <Link href={`/audit/${contract.id}`} className="text-sm text-accent hover:underline">
            View public audit →
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          {legs.map((leg) => (
            <div key={leg.id}>
              <LegTimeline legs={[leg]} currency={contract.localCurrency} />
              <LegActions leg={leg} busy={busy} act={act} />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

function LegActions({
  leg,
  busy,
  act,
}: {
  leg: Leg;
  busy: string | null;
  act: (legId: string, action: "dispute" | "cancel") => void;
}) {
  if (leg.state === "attested") {
    return (
      <div className="mt-1.5 flex justify-end">
        <button
          disabled={busy === leg.id + "dispute"}
          onClick={() => act(leg.id, "dispute")}
          className="rounded-lg border border-danger/40 px-3 py-1 text-xs text-danger transition hover:bg-danger-soft disabled:opacity-40"
        >
          Dispute this release
        </button>
      </div>
    );
  }
  if (leg.state === "pending" || leg.state === "window_open") {
    return (
      <div className="mt-1.5 flex justify-end">
        <button
          disabled={busy === leg.id + "cancel"}
          onClick={() => act(leg.id, "cancel")}
          className="rounded-lg border border-line px-3 py-1 text-xs text-text-muted transition hover:bg-white/5 disabled:opacity-40"
        >
          Cancel & refund this term
        </button>
      </div>
    );
  }
  return null;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "muted" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`tabular mt-1 text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
