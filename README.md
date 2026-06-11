# TrailPay ⚡

**The programmable trust layer for African education.**

Diaspora parents lock a full year of school fees in Lightning escrow. Each term
releases only when the school cryptographically confirms enrollment. Unused
terms auto-refund to the sender. Built on the **Milestone-Locked Multi-Leg
Escrow (MMLE)** primitive — a stack of hodl invoices, milestone-gated, with
deterministic refund.

This repo is a runnable hackathon MVP that works out-of-the-box with **zero
cloud setup**: a local SQLite database and a mock Lightning backend that
performs the *real* cryptographic operations of a hodl invoice (random
preimage, SHA-256 payment hash, settle-by-preimage-reveal).

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

The server auto-seeds 4 schools + a demo sender and starts the MMLE background
ticker (opens windows, releases attested legs after the dispute window,
auto-refunds expired legs).

### Real Lightning mode (optional, requires Docker)

To run against **real LND nodes** — where each term's hodl invoice is genuinely
paid and held on a Lightning node, then settled by preimage reveal — spin up a
local regtest network (two LND nodes + bitcoind, via Polar's images):

```bash
npm run ln:up      # start bitcoind + payee (TrailPay) + payer (sender) nodes
npm run ln:setup   # fund payer, open a channel, write .env.local (LIGHTNING_BACKEND=lnd)
npm run dev        # restart — now using real nodes
npm run ln:down    # tear everything down
```

Verified behaviour on real nodes: creating a full-year contract pays and **holds**
3 hodl invoices; attesting a term reveals the preimage and the school node
receives the sats; a dropped-out term cancels the held HTLC and refunds the payer.

## The 90-second demo

Open **http://localhost:3000/demo** — a three-panel view (parent · school ·
public audit). Drive it with the keyboard:

| Key | Action |
|-----|--------|
| `1` | New contract — Amina (Dubai) → Kisumu Boys, full year, 3 hodl invoices |
| `2` | School attests the open term → preimage releases → M-Pesa settles |
| `3` | Open the next term's redemption window |
| `4` | Student drops out → window closes unredeemed → **auto-refund** |
| `0` | Reset demo |
| `~` | Toggle the Lightning debug overlay (payment hashes + revealed preimages) |

The dispute window is collapsed to ~6s in demo mode (`DEMO_MODE=true`) so the
full lifecycle is visible live. Set `DEMO_MODE=false` for production timing.

## How it works

- `lib/mmle.ts` — the engine: contract creation, the per-leg state machine
  (`pending → window_open → attested → released → settled` / `→ refunded`),
  attestation, dispute, refund, and the idempotent `processTick()`.
- `lib/lightning/index.ts` — pluggable backend interface. Ships `mock`;
  production swaps in Voltage/LND via `lightning` (ln-service).
- `lib/crypto.ts` — preimage generation, AES-256-GCM encryption at rest,
  attestation signatures, beneficiary pseudonyms.
- `lib/db/` — Drizzle schema + SQLite client (Postgres/Neon-portable shapes).
- `lib/nostr/` — offline-safe audit-event id derivation (production: NDK → relays).
- `instrumentation.ts` — seeds data + runs the background ticker on boot.

## Verifying the cryptography

The revealed preimage of any settled term hashes to its payment hash:

```
SHA256(leg.preimageRevealed) === leg.paymentHash
```

(Confirmed in the smoke test — see the demo flow above.)

## Production swap-ins

This MVP is structured so production is an additive swap, not a rewrite:

| Layer | Demo | Production |
|-------|------|------------|
| Database | SQLite (`data/`) | Neon Postgres (same Drizzle schema) |
| Lightning | mock hodl invoices | Voltage/LND via `lightning` |
| Sender on-ramp | simulated | Stripe → Bitnob USD / Strike |
| School off-ramp | simulated M-Pesa receipt | Bitnob B2B Paybill |
| Attestation | HMAC signature | WebAuthn passkey |
| Audit | derived event ids | Nostr (NIP-23 / NIP-01) via NDK |
| Realtime | SSE + ticker | SSE + Vercel Cron + Fly.io LND stream |

See `.env.example` and the root `trailpay_implementation_plan.md` for the full
production roadmap.
