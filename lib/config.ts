/**
 * Central runtime config. Values are demo-friendly defaults; production swaps
 * these via env vars (see .env.example in the implementation plan).
 */

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

function int(v: string | undefined, fallback: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  /** When true, dispute windows + term windows collapse to seconds for live demos. */
  demoMode: bool(process.env.DEMO_MODE, true),

  /** Lightning backend. "mock" runs with zero setup; "lnd" uses real nodes. */
  lightningBackend: (process.env.LIGHTNING_BACKEND ?? "mock") as
    | "mock"
    | "lnd"
    | "voltage"
    | "polar",

  /**
   * How long after a school attests before the preimage is revealed.
   * Real product: 48h. Demo: a few seconds so judges see the full lifecycle.
   */
  disputeWindowMs: int(
    process.env.DISPUTE_WINDOW_MS,
    bool(process.env.DEMO_MODE, true) ? 6_000 : 48 * 60 * 60 * 1000,
  ),

  /** Platform fee on the locked principal. */
  feeRate: 0.025,
  /** Optional FX hedge premium. */
  fxHedgeRate: 0.005,

  /** Fixed demo FX. Production: live oracle (CoinGecko + Bitnob rate). */
  fx: {
    kesPerUsd: int(process.env.FX_KES_PER_USD, 145),
    /** sats per 1 USD, derived from an assumed BTC price for demo stability. */
    btcUsd: int(process.env.FX_BTC_USD, 100_000),
  },

  /** Real LND connections (regtest via Polar images, or Voltage in prod). */
  lnd: {
    payee: {
      socket: process.env.LND_PAYEE_SOCKET ?? "127.0.0.1:10009",
      cert: process.env.LND_PAYEE_CERT ?? "",
      macaroon: process.env.LND_PAYEE_MACAROON ?? "",
    },
    payer: {
      socket: process.env.LND_PAYER_SOCKET ?? "127.0.0.1:10010",
      cert: process.env.LND_PAYER_CERT ?? "",
      macaroon: process.env.LND_PAYER_MACAROON ?? "",
    },
  },

  preimageKey:
    process.env.PREIMAGE_ENCRYPTION_KEY ??
    "dev-only-insecure-key-change-me-in-production-0000",

  nostrRelays: (
    process.env.NOSTR_RELAYS ?? "wss://relay.damus.io,wss://nos.lol"
  ).split(","),
} as const;

export const SATS_PER_USD = Math.round(100_000_000 / config.fx.btcUsd);
