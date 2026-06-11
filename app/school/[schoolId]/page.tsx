"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/Nav";
import { StateBadge } from "@/components/StateBadge";
import type { School } from "@/lib/db/schema";
import type { PendingItem } from "@/lib/types";
import { fmtLocal } from "@/lib/pricing";

export default function SchoolPortal({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = use(params);
  const [school, setSchool] = useState<School | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/school/${schoolId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setSchool(j.data.school);
          setPending(j.data.pending);
        }
      });
  }, [schoolId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 1500);
    return () => clearInterval(t);
  }, [load]);

  async function attest(legId: string) {
    setBusy(legId);
    await fetch(`/api/legs/${legId}/attest`, { method: "POST" });
    setBusy(null);
    load();
  }

  const awaiting = pending.filter((p) => p.leg.state === "window_open");
  const inFlight = pending.filter((p) => p.leg.state === "attested");

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{school?.logoEmoji}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{school?.name}</h1>
            <p className="text-sm text-text-muted">
              Bursar portal · Paybill {school?.paybillNumber}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Awaiting attestation ({awaiting.length})
          </h2>
          <div className="mt-3 space-y-3">
            {awaiting.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center text-sm text-text-muted">
                No terms awaiting confirmation right now.
              </div>
            )}
            {awaiting.map(({ contract, leg }) => (
              <div key={leg.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-5">
                <div>
                  <div className="font-medium">
                    {contract.beneficiaryName}{" "}
                    <span className="text-text-muted">· {leg.milestoneLabel}</span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {contract.beneficiaryGrade} · Adm {contract.beneficiaryAdmissionNo} ·{" "}
                    <span className="tabular">{contract.shortCode}</span>
                  </div>
                  <div className="tabular mt-1 text-sm text-success">
                    {fmtLocal(leg.amountLocal, contract.localCurrency)}
                  </div>
                </div>
                <button
                  disabled={busy === leg.id}
                  onClick={() => attest(leg.id)}
                  className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-[#1a1206] transition hover:brightness-110 disabled:opacity-40"
                >
                  {busy === leg.id ? "Signing…" : "🔑 Confirm enrolled & attest"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {inFlight.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Releasing ({inFlight.length})
            </h2>
            <div className="mt-3 space-y-3">
              {inFlight.map(({ contract, leg }) => (
                <div key={leg.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-5">
                  <div>
                    <div className="font-medium">
                      {contract.beneficiaryName}{" "}
                      <span className="text-text-muted">· {leg.milestoneLabel}</span>
                    </div>
                    <div className="text-xs text-text-muted">
                      Attested · preimage releasing after dispute window
                    </div>
                  </div>
                  <StateBadge state={leg.state} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
