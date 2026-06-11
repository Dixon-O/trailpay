import { config, SATS_PER_USD } from "./config";

export interface Money {
  local: number; // KES
  usd: number;
  sats: number;
}

export function kesToParts(localKes: number): Money {
  const usd = localKes / config.fx.kesPerUsd;
  return {
    local: Math.round(localKes),
    usd: round2(usd),
    sats: Math.round(usd * SATS_PER_USD),
  };
}

export interface ContractQuote {
  terms: number;
  termFeeLocal: number;
  localCurrency: string;
  principal: Money;
  fee: Money;
  fxHedge: Money;
  /** What the diaspora sender pays at checkout (principal + fee + optional hedge). */
  senderTotalUsd: number;
  /** Per-leg breakdown. */
  legs: { label: string; amount: Money }[];
  /** What Western Union would have charged, for the comparison callout. */
  legacyComparisonUsd: number;
}

const LEGACY_REMITTANCE_RATE = 0.12;

export function quoteContract(opts: {
  termFeeLocal: number;
  terms: number;
  localCurrency: string;
  fxHedge: boolean;
}): ContractQuote {
  const { termFeeLocal, terms, localCurrency, fxHedge } = opts;
  const principalLocal = termFeeLocal * terms;
  const principal = kesToParts(principalLocal);
  const fee = kesToParts(principalLocal * config.feeRate);
  const fxHedgeMoney = kesToParts(fxHedge ? principalLocal * config.fxHedgeRate : 0);

  const legs = Array.from({ length: terms }, (_, i) => ({
    label: `Term ${i + 1}`,
    amount: kesToParts(termFeeLocal),
  }));

  const senderTotalUsd = round2(principal.usd + fee.usd + fxHedgeMoney.usd);
  const legacyComparisonUsd = round2(principal.usd * (1 + LEGACY_REMITTANCE_RATE));

  return {
    terms,
    termFeeLocal,
    localCurrency,
    principal,
    fee,
    fxHedge: fxHedgeMoney,
    senderTotalUsd,
    legs,
    legacyComparisonUsd,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fmtSats(sats: number): string {
  return `${sats.toLocaleString("en-US")} sats`;
}

export function fmtLocal(amount: number, currency = "KES"): string {
  return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
}

export function fmtUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
