"use client";

import { use } from "react";
import Link from "next/link";
import { Brand } from "@/components/Nav";
import { useContractStream } from "@/hooks/useContractStream";

const EVENT_ICON: Record<string, string> = {
  contract_created: "📝",
  funded: "💰",
  window_opened: "📂",
  attested: "🔑",
  released: "⚡",
  settled: "✅",
  refunded: "↩️",
  disputed: "⚠️",
};

export default function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = useContractStream(id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
      <div className="flex items-center justify-between">
        <Brand small />
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-muted">
          Public audit · read-only
        </span>
      </div>

      {!data?.contract ? (
        <p className="py-20 text-center text-text-muted">Loading audit trail…</p>
      ) : (
        <>
          <div className="mt-8">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.school?.logoEmoji} {data.school?.name}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Contract <span className="tabular">{data.contract.shortCode}</span> · beneficiary{" "}
              <span className="tabular">{data.contract.beneficiaryPseudonym}</span> (privacy-preserving)
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Every event below is signed and published to Nostr. Family members can
              independently verify funds reached the school.
            </p>
          </div>

          <ol className="mt-8 space-y-3">
            {data.events.map((e) => (
              <li key={e.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{EVENT_ICON[e.eventType] ?? "•"}</span>
                    <span className="font-medium capitalize">
                      {e.eventType.replace(/_/g, " ")}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-text-muted">
                      {e.actor}
                    </span>
                  </div>
                  <time className="tabular text-xs text-text-muted">
                    {new Date(e.createdAt).toLocaleString("en-GB")}
                  </time>
                </div>
                {e.nostrEventId && (
                  <div className="tabular mt-2 truncate text-[11px] text-accent/80">
                    {e.nostrEventId}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-text-muted hover:text-text">
              Powered by TrailPay ⚡
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
