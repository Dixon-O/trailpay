"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import type { School } from "@/lib/db/schema";
import type { ContractQuote } from "@/lib/pricing";
import { fmtLocal, fmtSats, fmtUsd } from "@/lib/pricing";

export default function SendPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<School | null>(null);
  const [admissionNo, setAdmissionNo] = useState("ADM-4421");
  const [name, setName] = useState("Brian Otieno");
  const [grade, setGrade] = useState("Form 3");
  const [terms, setTerms] = useState(3);
  const [fxHedge, setFxHedge] = useState(false);
  const [quote, setQuote] = useState<ContractQuote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schools")
      .then((r) => r.json())
      .then((j) => j.ok && setSchools(j.data));
  }, []);

  useEffect(() => {
    if (!selected) return setQuote(null);
    fetch(`/api/quote?schoolId=${selected.id}&terms=${terms}&fxHedge=${fxHedge}`)
      .then((r) => r.json())
      .then((j) => j.ok && setQuote(j.data));
  }, [selected, terms, fxHedge]);

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: selected.id,
        beneficiaryAdmissionNo: admissionNo,
        beneficiaryName: name,
        beneficiaryGrade: grade,
        terms,
        fxHedge,
      }),
    }).then((r) => r.json());
    setSubmitting(false);
    if (res.ok) router.push(`/parent/contract/${res.data.id}`);
    else setError(res.error ?? "Failed");
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Lock school fees</h1>
        <p className="mt-1 text-text-muted">
          Pay once from abroad. Each term unlocks only when the school confirms enrollment.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <section>
              <Label>1 · Choose a school</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {schools.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`glass flex items-center gap-3 rounded-2xl p-4 text-left transition hover:bg-white/10 ${
                      selected?.id === s.id ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    <span className="text-2xl">{s.logoEmoji}</span>
                    <span>
                      <span className="block font-medium">{s.name}</span>
                      <span className="block text-xs text-text-muted">
                        {s.city}, {s.country} · {fmtLocal(s.termFeeLocal, s.localCurrency)}/term
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <Label>2 · Student details</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Input label="Admission no." value={admissionNo} onChange={setAdmissionNo} />
                <Input label="Student name" value={name} onChange={setName} />
                <Input label="Grade" value={grade} onChange={setGrade} />
              </div>
            </section>

            <section>
              <Label>3 · Plan</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTerms(t)}
                    className={`glass rounded-xl px-4 py-2 text-sm transition hover:bg-white/10 ${
                      terms === t ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    {t === 3 ? "Full year (3 terms)" : t === 1 ? "Single term" : `${t} terms`}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={fxHedge}
                  onChange={(e) => setFxHedge(e.target.checked)}
                  className="accent-accent"
                />
                Lock the KES rate now (+0.5% FX hedge)
              </label>
            </section>
          </div>

          {/* Quote panel */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="glass rounded-3xl p-6">
              <div className="text-sm font-medium text-text-muted">You pay</div>
              <div className="tabular mt-1 text-4xl font-semibold">
                {quote ? fmtUsd(quote.senderTotalUsd) : "—"}
              </div>
              {quote && (
                <>
                  <div className="mt-4 space-y-2 text-sm">
                    <Row label={`School receives (${quote.terms} terms)`} value={fmtLocal(quote.principal.local, quote.localCurrency)} />
                    <Row label="Locked in escrow" value={fmtSats(quote.principal.sats)} mono />
                    <Row label="TrailPay fee (2.5%)" value={fmtUsd(quote.fee.usd)} />
                    {fxHedge && <Row label="FX hedge (0.5%)" value={fmtUsd(quote.fxHedge.usd)} />}
                  </div>
                  <div className="my-4 h-px bg-line" />
                  <div className="rounded-xl bg-success-soft p-3 text-sm">
                    <span className="text-text-muted">Western Union would charge </span>
                    <span className="tabular font-semibold text-text line-through">
                      {fmtUsd(quote.legacyComparisonUsd)}
                    </span>
                    <span className="text-success">
                      {" "}
                      — you save {fmtUsd(quote.legacyComparisonUsd - quote.senderTotalUsd)}/yr
                    </span>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {quote.legs.map((l) => (
                      <div key={l.label} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                        <span className="text-text-muted">{l.label}</span>
                        <span className="tabular">{fmtLocal(l.amount.local, quote.localCurrency)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {error && <p className="mt-3 text-sm text-danger">{error}</p>}

              <button
                disabled={!selected || submitting}
                onClick={submit}
                className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-medium text-[#1a1206] transition hover:brightness-110 disabled:opacity-40"
              >
                {submitting ? "Locking funds…" : "Lock funds with Lightning"}
              </button>
              <p className="mt-2 text-center text-[11px] text-text-muted">
                Demo simulates Stripe checkout + Bitnob settlement
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{children}</h2>;
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={mono ? "tabular" : ""}>{value}</span>
    </div>
  );
}
