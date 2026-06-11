import { Nav } from "@/components/Nav";

export default function DisputesPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Dispute resolution</h1>
        <p className="mt-2 text-text-muted">
          Most disputes never happen: a sender simply disputes within the 48-hour
          window after an attestation, and the release is halted automatically. For
          contested cases, Tier-2 arbitration is on the roadmap.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="glass rounded-2xl p-5">
              <div className="text-xs font-semibold text-text-muted">Stage {i + 1}</div>
              <h3 className="mt-1 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 glass rounded-2xl p-6 text-sm text-text-muted">
          <span className="rounded-full bg-pending-soft px-2 py-0.5 text-xs text-pending">
            Roadmap
          </span>
          <p className="mt-3">
            Tier-2 arbitration: an opt-in 0.5% surcharge unlocks review by a 3-of-5
            panel of community arbitrators staked in sats, for transactions above $50.
            Empty queue for the MVP — included so the path is visible.
          </p>
        </div>
      </main>
    </>
  );
}

const STEPS = [
  { title: "Auto-resolution", body: "Window closes unredeemed → deterministic auto-refund to the sender." },
  { title: "48h dispute window", body: "Sender halts a release after attestation; school must provide evidence." },
  { title: "Tier-2 arbitration", body: "Staked community panel rules on contested high-value cases." },
];
