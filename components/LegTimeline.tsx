"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Leg } from "@/lib/db/schema";
import { StateBadge } from "./StateBadge";
import { fmtLocal, fmtSats } from "@/lib/pricing";

export function LegTimeline({
  legs,
  currency = "KES",
  compact,
}: {
  legs: Leg[];
  currency?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {legs.map((leg) => (
        <LegCard key={leg.id} leg={leg} currency={currency} compact={compact} />
      ))}
    </div>
  );
}

function LegCard({ leg, currency, compact }: { leg: Leg; currency: string; compact?: boolean }) {
  const settled = leg.state === "settled";
  const refunded = leg.state === "refunded" || leg.state === "cancelled";
  const accent = settled
    ? "border-success/40"
    : refunded
      ? "border-danger/30"
      : leg.state === "attested"
        ? "border-info/40"
        : leg.state === "window_open"
          ? "border-pending/40"
          : "border-line";

  return (
    <motion.div
      layout
      className={`glass relative overflow-hidden rounded-2xl border p-4 ${accent}`}
    >
      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-success/20 to-transparent"
          />
        )}
        {refunded && (
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute inset-0 bg-danger/10"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold ${
              settled ? "bg-success-soft text-success" : refunded ? "bg-danger-soft text-danger" : "bg-white/5 text-text-muted"
            }`}
          >
            {leg.sequenceIndex}
          </div>
          <div>
            <div className="font-medium">{leg.milestoneLabel}</div>
            <div className="tabular text-xs text-text-muted">
              {fmtLocal(leg.amountLocal, currency)} · {fmtSats(leg.amountSats)}
            </div>
          </div>
        </div>
        <StateBadge state={leg.state} />
      </div>

      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-muted sm:grid-cols-3">
          <Field label="Payment hash" value={leg.paymentHash ? `${leg.paymentHash.slice(0, 14)}…` : "—"} mono />
          {leg.preimageRevealed ? (
            <Field label="Preimage (revealed)" value={`${leg.preimageRevealed.slice(0, 14)}…`} mono highlight />
          ) : (
            <Field label="Preimage" value="🔒 sealed" />
          )}
          {leg.mpesaReceipt ? (
            <Field label="M-Pesa receipt" value={leg.mpesaReceipt} mono highlight />
          ) : (
            <Field label="Window closes" value={fmtDate(leg.windowClosesAt)} />
          )}
        </div>
      )}
    </motion.div>
  );
}

function Field({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-text-muted/70">{label}</div>
      <div className={`${mono ? "tabular" : ""} ${highlight ? "text-success" : "text-text"} truncate`}>{value}</div>
    </div>
  );
}

function fmtDate(d: Date | number | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
