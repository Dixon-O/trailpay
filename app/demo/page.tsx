"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brand } from "@/components/Nav";
import { StateBadge } from "@/components/StateBadge";
import { useContractStream } from "@/hooks/useContractStream";
import { fmtLocal, fmtSats, fmtUsd } from "@/lib/pricing";
import type { Leg } from "@/lib/db/schema";

export default function DemoPage() {
  const [contractId, setContractId] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const data = useContractStream(contractId ?? "");

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const createContract = useCallback(async () => {
    const schools = await fetch("/api/schools").then((r) => r.json());
    const kisumu = schools.data?.find((s: { slug: string }) => s.slug === "kisumu-boys-high") ?? schools.data?.[0];
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: kisumu.id,
        beneficiaryAdmissionNo: "ADM-4421",
        beneficiaryName: "Brian Otieno",
        beneficiaryGrade: "Form 3",
        terms: 3,
      }),
    }).then((r) => r.json());
    if (res.ok) {
      setContractId(res.data.id);
      flash("Contract created — full year locked in 3 hodl invoices");
    }
  }, []);

  const attestOpen = useCallback(async () => {
    const leg = data?.legs.find((l) => l.state === "window_open");
    if (!leg) return flash("No open term to attest");
    await fetch(`/api/legs/${leg.id}/attest`, { method: "POST" });
    flash(`${leg.milestoneLabel}: school attested — releasing after dispute window`);
  }, [data]);

  const openNext = useCallback(async () => {
    const leg = data?.legs.find((l) => l.state === "pending");
    if (!leg) return flash("No further terms to open");
    await fetch(`/api/legs/${leg.id}/open`, { method: "POST" });
    flash(`${leg.milestoneLabel}: redemption window opened`);
  }, [data]);

  const dropOut = useCallback(async () => {
    const leg =
      data?.legs.find((l) => l.state === "window_open") ??
      data?.legs.find((l) => l.state === "pending");
    if (!leg) return flash("No active term to expire");
    await fetch(`/api/legs/${leg.id}/expire`, { method: "POST" });
    flash(`${leg.milestoneLabel}: window closed unredeemed — auto-refunding parent`);
  }, [data]);

  const reset = useCallback(async () => {
    await fetch("/api/demo/reset", { method: "POST" });
    setContractId(null);
    flash("Demo reset");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "1") createContract();
      else if (e.key === "2") attestOpen();
      else if (e.key === "3") openNext();
      else if (e.key === "4") dropOut();
      else if (e.key === "0") reset();
      else if (e.key === "`" || e.key === "~") setDebug((d) => !d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createContract, attestOpen, openNext, dropOut, reset]);

  const c = data?.contract;
  const currency = c?.localCurrency ?? "KES";

  return (
    <main className="flex min-h-screen flex-col px-5 py-5">
      <div className="flex items-center justify-between">
        <Brand small />
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">~</kbd> debug
          <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-accent">
            Live LN demo
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Key k="1" label="New contract" onClick={createContract} />
        <Key k="2" label="School attests" onClick={attestOpen} primary />
        <Key k="3" label="Open next term" onClick={openNext} />
        <Key k="4" label="Student drops out" onClick={dropOut} danger />
        <Key k="0" label="Reset" onClick={reset} />
      </div>

      {/* Triple viewport */}
      <div className="mt-5 grid flex-1 gap-4 lg:grid-cols-3">
        <Viewport title="👩🏽‍⚕️ Parent · Dubai">
          {!c ? (
            <Empty hint="Press 1 to create a contract" />
          ) : (
            <div className="space-y-3">
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{data?.school?.name}</span>
                  <StateBadge state={c.state} />
                </div>
                <div className="tabular mt-1 text-xs text-text-muted">
                  {fmtUsd(c.senderAmount)} paid · {fmtLocal(c.totalAmountLocal, currency)} locked
                </div>
              </div>
              {data?.legs.map((l) => (
                <MiniLeg key={l.id} leg={l} currency={currency} />
              ))}
            </div>
          )}
        </Viewport>

        <Viewport title="🏫 School · Bursar portal">
          {!c ? (
            <Empty hint="Awaiting a contract" />
          ) : (
            <div className="space-y-3">
              {data?.legs
                .filter((l) => ["window_open", "attested"].includes(l.state))
                .map((l) => (
                  <div key={l.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{l.milestoneLabel}</span>
                      <StateBadge state={l.state} />
                    </div>
                    <div className="tabular mt-1 text-xs text-text-muted">
                      {c.beneficiaryName} · {fmtLocal(l.amountLocal, currency)}
                    </div>
                    {l.state === "window_open" && (
                      <button
                        onClick={attestOpen}
                        className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-xs font-medium text-[#1a1206]"
                      >
                        🔑 Confirm enrolled & attest
                      </button>
                    )}
                  </div>
                ))}
              {data?.legs.every((l) => !["window_open", "attested"].includes(l.state)) && (
                <Empty hint="No terms awaiting attestation" />
              )}
            </div>
          )}
        </Viewport>

        <Viewport title="🔎 Public audit · Nostr">
          {!c ? (
            <Empty hint="No events yet" />
          ) : (
            <div className="space-y-2">
              {data?.events.slice(0, 9).map((e) => (
                <div key={e.id} className="glass rounded-xl p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{e.eventType.replace(/_/g, " ")}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-text-muted">
                      {e.actor}
                    </span>
                  </div>
                  {e.nostrEventId && (
                    <div className="tabular mt-1 truncate text-[10px] text-accent/70">
                      {e.nostrEventId.slice(0, 32)}…
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Viewport>
      </div>

      {/* Debug overlay */}
      <AnimatePresence>
        {debug && c && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-5 bottom-5 z-50 glass rounded-2xl border border-accent/30 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-accent">
              ⚡ LIGHTNING DEBUG · node: trailpay-mock · backend: hodl-invoice
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {data?.legs.map((l) => (
                <div key={l.id} className="rounded-lg bg-black/30 p-2 text-[10px]">
                  <div className="font-medium text-text">{l.milestoneLabel} · {l.state}</div>
                  <div className="tabular text-text-muted">hash: {l.paymentHash?.slice(0, 24)}…</div>
                  <div className="tabular text-text-muted">
                    preimage:{" "}
                    {l.preimageRevealed ? (
                      <span className="text-success">{l.preimageRevealed.slice(0, 24)}…</span>
                    ) : (
                      <span className="text-pending">🔒 sealed</span>
                    )}
                  </div>
                  <div className="tabular text-text-muted">{fmtSats(l.amountSats)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-5 z-50 -translate-x-1/2 glass rounded-full px-5 py-2.5 text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Key({ k, label, onClick, primary, danger }: { k: string; label: string; onClick: () => void; primary?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition hover:brightness-110 ${
        primary
          ? "bg-accent text-[#1a1206]"
          : danger
            ? "border border-danger/40 text-danger hover:bg-danger-soft"
            : "glass"
      }`}
    >
      <kbd className={`rounded px-1.5 py-0.5 text-xs ${primary ? "bg-black/20" : "bg-white/10"}`}>{k}</kbd>
      {label}
    </button>
  );
}

function Viewport({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-3xl border border-line bg-bg-elevated/50 p-4">
      <div className="mb-3 text-sm font-medium text-text-muted">{title}</div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="grid h-full min-h-40 place-items-center text-center text-xs text-text-muted">
      {hint}
    </div>
  );
}

function MiniLeg({ leg, currency }: { leg: Leg; currency: string }) {
  const settled = leg.state === "settled";
  const refunded = leg.state === "refunded" || leg.state === "cancelled";
  return (
    <motion.div
      layout
      className={`glass relative overflow-hidden rounded-2xl p-3 ${
        settled ? "border border-success/40" : refunded ? "border border-danger/30" : ""
      }`}
    >
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-success/25 to-transparent"
          />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{leg.milestoneLabel}</span>
        <StateBadge state={leg.state} />
      </div>
      <div className="tabular mt-1 text-xs text-text-muted">
        {fmtLocal(leg.amountLocal, currency)}
        {leg.mpesaReceipt && <span className="text-success"> · {leg.mpesaReceipt}</span>}
      </div>
    </motion.div>
  );
}
