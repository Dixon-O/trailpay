import { customAlphabet } from "nanoid";
import { randomBytes } from "crypto";
import { eq, and, asc, desc, inArray, lte } from "drizzle-orm";
import { db } from "./db/client";
import { contracts, legs, legEvents, schools, users } from "./db/schema";
import type { Leg, LegState, ContractState } from "./db/schema";
import { getLightning } from "./lightning";
import { attestationSignature, beneficiaryPseudonym } from "./crypto";
import { publishAuditEvent } from "./nostr";
import { quoteContract } from "./pricing";
import { config } from "./config";

const shortCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const DAY = 24 * 60 * 60 * 1000;
const ln = getLightning();

/* ------------------------------------------------------------------ events */

async function recordEvent(args: {
  legId?: string;
  contractId: string;
  eventType: string;
  actor: string;
  payload?: Record<string, unknown>;
}) {
  const nostrEventId = publishAuditEvent(args.eventType, {
    contractId: args.contractId,
    legId: args.legId,
    ...args.payload,
  });
  await db.insert(legEvents).values({
    legId: args.legId ?? null,
    contractId: args.contractId,
    eventType: args.eventType,
    actor: args.actor,
    payload: args.payload ?? null,
    nostrEventId,
  });
  return nostrEventId;
}

async function recomputeContractState(contractId: string) {
  const allLegs = await db.select().from(legs).where(eq(legs.contractId, contractId));
  const states = allLegs.map((l) => l.state);
  const terminal = (s: LegState) =>
    s === "settled" || s === "refunded" || s === "cancelled";
  const released = states.filter((s) => s === "settled").length;
  const refunded = states.filter((s) => s === "refunded" || s === "cancelled").length;

  let next: ContractState = "active";
  if (states.every(terminal)) {
    if (refunded === 0) next = "completed";
    else if (released === 0) next = "fully_refunded";
    else next = "partially_refunded";
  }
  await db
    .update(contracts)
    .set({ state: next, updatedAt: new Date() })
    .where(eq(contracts.id, contractId));
  return next;
}

/* ---------------------------------------------------------------- creation */

export interface CreateContractInput {
  senderId: string;
  schoolId: string;
  beneficiaryAdmissionNo: string;
  beneficiaryName: string;
  beneficiaryGrade?: string;
  terms: number;
  fxHedge?: boolean;
}

export async function createContract(input: CreateContractInput) {
  const school = await db.query.schools.findFirst({
    where: eq(schools.id, input.schoolId),
  });
  if (!school) throw new Error("School not found");

  const quote = quoteContract({
    termFeeLocal: school.termFeeLocal,
    terms: input.terms,
    localCurrency: school.localCurrency,
    fxHedge: input.fxHedge ?? false,
  });

  const contractSecret = randomBytes(16).toString("hex");
  const now = Date.now();

  const [contract] = await db
    .insert(contracts)
    .values({
      shortCode: shortCode(),
      senderId: input.senderId,
      schoolId: input.schoolId,
      beneficiaryAdmissionNo: input.beneficiaryAdmissionNo,
      beneficiaryName: input.beneficiaryName,
      beneficiaryGrade: input.beneficiaryGrade ?? null,
      beneficiaryPseudonym: beneficiaryPseudonym(
        input.beneficiaryAdmissionNo,
        contractSecret,
      ),
      contractSecret,
      state: "awaiting_payment",
      totalAmountSats: quote.principal.sats,
      totalAmountLocal: quote.principal.local,
      localCurrency: school.localCurrency,
      senderCurrency: "USD",
      senderAmount: quote.senderTotalUsd,
      feeAmount: quote.fee.usd,
      fxHedgeEnabled: input.fxHedge ?? false,
    })
    .returning();

  const contractNostr = publishAuditEvent("contract_created", {
    contractId: contract.id,
    shortCode: contract.shortCode,
    school: school.name,
    beneficiaryPseudonym: contract.beneficiaryPseudonym,
    terms: input.terms,
    totalSats: quote.principal.sats,
  });
  await db
    .update(contracts)
    .set({ nostrEventId: contractNostr })
    .where(eq(contracts.id, contract.id));

  // Build a realistic academic-year schedule: term 1 open now, later terms in
  // the future. The demo can fast-forward any leg's window on demand.
  for (let i = 0; i < input.terms; i++) {
    const opensAt = i === 0 ? now : now + i * 120 * DAY;
    const closesAt = opensAt + 25 * DAY;
    const invoice = await ln.createHodlInvoice({
      amountSats: quote.legs[i].amount.sats,
      description: `TrailPay | ${school.name} | Term ${i + 1} | ${contract.beneficiaryPseudonym}`,
      expirySeconds: Math.round((closesAt - now) / 1000),
    });
    await db.insert(legs).values({
      contractId: contract.id,
      sequenceIndex: i + 1,
      milestoneLabel: `Term ${i + 1}`,
      amountSats: quote.legs[i].amount.sats,
      amountLocal: quote.legs[i].amount.local,
      state: "pending",
      paymentHash: invoice.paymentHash,
      preimageEncrypted: invoice.preimageEncrypted,
      bolt11: invoice.bolt11,
      windowOpensAt: new Date(opensAt),
      windowClosesAt: new Date(closesAt),
    });
  }

  // Simulate the Stripe payment + Lightning funding completing instantly.
  await db
    .update(contracts)
    .set({ state: "funded" })
    .where(eq(contracts.id, contract.id));
  await recordEvent({
    contractId: contract.id,
    eventType: "funded",
    actor: "system",
    payload: { senderUsd: quote.senderTotalUsd, legs: input.terms },
  });

  // Open the first term's redemption window immediately.
  const firstLeg = await db.query.legs.findFirst({
    where: and(eq(legs.contractId, contract.id), eq(legs.sequenceIndex, 1)),
  });
  if (firstLeg) await openWindow(firstLeg.id);

  await db.update(contracts).set({ state: "active" }).where(eq(contracts.id, contract.id));

  return { id: contract.id, shortCode: contract.shortCode };
}

/* ------------------------------------------------------------- transitions */

export async function openWindow(legId: string) {
  const leg = await getLeg(legId);
  if (leg.state !== "pending") return leg;
  await db
    .update(legs)
    .set({ state: "window_open", windowOpensAt: new Date() })
    .where(eq(legs.id, legId));
  await recordEvent({
    legId,
    contractId: leg.contractId,
    eventType: "window_opened",
    actor: "system",
    payload: { milestone: leg.milestoneLabel },
  });
  return getLeg(legId);
}

export async function attestLeg(legId: string, adminId: string) {
  const leg = await getLeg(legId);
  if (leg.state !== "window_open") {
    throw new Error(`Leg ${leg.milestoneLabel} is not awaiting attestation`);
  }
  const sig = attestationSignature(legId, adminId);
  const releaseAt = Date.now() + config.disputeWindowMs;
  await db
    .update(legs)
    .set({
      state: "attested",
      attestedAt: new Date(),
      attestedBy: adminId,
      attestationSig: sig,
      releaseScheduledAt: new Date(releaseAt),
    })
    .where(eq(legs.id, legId));
  await recordEvent({
    legId,
    contractId: leg.contractId,
    eventType: "attested",
    actor: "school_admin",
    payload: { milestone: leg.milestoneLabel, signature: sig.slice(0, 16), releaseAt },
  });
  return getLeg(legId);
}

export async function disputeLeg(legId: string) {
  const leg = await getLeg(legId);
  if (leg.state !== "attested") throw new Error("Only attested legs can be disputed");
  await db
    .update(legs)
    .set({ state: "disputed", disputedAt: new Date(), releaseScheduledAt: null })
    .where(eq(legs.id, legId));
  await recordEvent({
    legId,
    contractId: leg.contractId,
    eventType: "disputed",
    actor: "sender",
    payload: { milestone: leg.milestoneLabel },
  });
  return getLeg(legId);
}

async function releaseLeg(leg: Leg) {
  if (!leg.preimageEncrypted) throw new Error("Missing preimage");
  const preimageHex = await ln.settle(leg.preimageEncrypted);
  await db
    .update(legs)
    .set({ state: "released", releasedAt: new Date(), preimageRevealed: preimageHex })
    .where(eq(legs.id, leg.id));
  await recordEvent({
    legId: leg.id,
    contractId: leg.contractId,
    eventType: "released",
    actor: "lnd",
    payload: {
      milestone: leg.milestoneLabel,
      paymentHash: leg.paymentHash,
      preimage: preimageHex,
    },
  });

  // Simulate Bitnob B2B Paybill off-ramp settling to the school's M-Pesa.
  const receipt = `MPESA-${randomBytes(4).toString("hex").toUpperCase()}`;
  await db
    .update(legs)
    .set({ state: "settled", settledAt: new Date(), mpesaReceipt: receipt })
    .where(eq(legs.id, leg.id));
  await recordEvent({
    legId: leg.id,
    contractId: leg.contractId,
    eventType: "settled",
    actor: "bitnob",
    payload: { milestone: leg.milestoneLabel, mpesaReceipt: receipt, amountLocal: leg.amountLocal },
  });
  await recomputeContractState(leg.contractId);
}

async function refundLeg(leg: Leg, reason: string, actor: string) {
  if (leg.paymentHash) await ln.cancel(leg.paymentHash);
  await db
    .update(legs)
    .set({ state: "refund_initiated" })
    .where(eq(legs.id, leg.id));
  await db
    .update(legs)
    .set({ state: "refunded", refundedAt: new Date() })
    .where(eq(legs.id, leg.id));
  await recordEvent({
    legId: leg.id,
    contractId: leg.contractId,
    eventType: "refunded",
    actor,
    payload: { milestone: leg.milestoneLabel, reason, amountLocal: leg.amountLocal },
  });
  await recomputeContractState(leg.contractId);
}

/** Sender cancels a leg whose window hasn't been attested yet. */
export async function cancelLegBySender(legId: string) {
  const leg = await getLeg(legId);
  if (!["pending", "window_open"].includes(leg.state)) {
    throw new Error("Leg can no longer be cancelled by sender");
  }
  await refundLeg(leg, "sender_cancelled", "sender");
  return getLeg(legId);
}

/* --------------------------------------------------------------- demo ctrl */

export async function demoExpireWindow(legId: string) {
  const leg = await getLeg(legId);
  if (leg.state === "pending") await openWindow(legId);
  const fresh = await getLeg(legId);
  if (fresh.state === "window_open") {
    await refundLeg(fresh, "window_closed_unredeemed", "system");
  }
  return getLeg(legId);
}

/* ------------------------------------------------------------------ ticker */

/**
 * Cancel every still-held hodl invoice (non-terminal legs). Used on demo reset
 * so real LND channel liquidity isn't left locked up between runs. No-op for the
 * mock backend.
 */
export async function cancelAllOutstandingInvoices() {
  const outstanding = await db
    .select()
    .from(legs)
    .where(inArray(legs.state, ["pending", "window_open", "attested", "disputed"]));
  for (const leg of outstanding) {
    if (leg.paymentHash) {
      try {
        await ln.cancel(leg.paymentHash);
      } catch {
        /* already settled/cancelled on-node */
      }
    }
  }
}

/** Idempotent processor: opens due windows, releases attested legs, refunds expired. */
export async function processTick() {
  const now = Date.now();

  const due = await db
    .select()
    .from(legs)
    .where(and(eq(legs.state, "pending"), lte(legs.windowOpensAt, new Date(now))));
  for (const leg of due) await openWindow(leg.id);

  const toRelease = await db
    .select()
    .from(legs)
    .where(
      and(eq(legs.state, "attested"), lte(legs.releaseScheduledAt, new Date(now))),
    );
  for (const leg of toRelease) await releaseLeg(leg);

  const expired = await db
    .select()
    .from(legs)
    .where(
      and(
        inArray(legs.state, ["window_open"]),
        lte(legs.windowClosesAt, new Date(now)),
      ),
    );
  for (const leg of expired) await refundLeg(leg, "window_closed_unredeemed", "system");
}

/* -------------------------------------------------------------------- reads */

async function getLeg(legId: string): Promise<Leg> {
  const leg = await db.query.legs.findFirst({ where: eq(legs.id, legId) });
  if (!leg) throw new Error("Leg not found");
  return leg;
}

export async function getContractFull(idOrCode: string) {
  const contract =
    (await db.query.contracts.findFirst({ where: eq(contracts.id, idOrCode) })) ??
    (await db.query.contracts.findFirst({ where: eq(contracts.shortCode, idOrCode) }));
  if (!contract) return null;

  const [school, sender, contractLegs, events] = await Promise.all([
    db.query.schools.findFirst({ where: eq(schools.id, contract.schoolId) }),
    db.query.users.findFirst({ where: eq(users.id, contract.senderId) }),
    db.select().from(legs).where(eq(legs.contractId, contract.id)).orderBy(asc(legs.sequenceIndex)),
    db
      .select()
      .from(legEvents)
      .where(eq(legEvents.contractId, contract.id))
      .orderBy(desc(legEvents.createdAt)),
  ]);

  return { contract, school, sender, legs: contractLegs, events };
}

export async function listContractsBySender(senderId: string) {
  const rows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.senderId, senderId))
    .orderBy(desc(contracts.createdAt));
  return Promise.all(
    rows.map(async (c) => ({
      contract: c,
      school: await db.query.schools.findFirst({ where: eq(schools.id, c.schoolId) }),
      legs: await db
        .select()
        .from(legs)
        .where(eq(legs.contractId, c.id))
        .orderBy(asc(legs.sequenceIndex)),
    })),
  );
}

export async function listPendingAttestations(schoolId: string) {
  const rows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.schoolId, schoolId));
  const result: {
    contract: typeof rows[number];
    leg: Leg;
  }[] = [];
  for (const c of rows) {
    const openLegs = await db
      .select()
      .from(legs)
      .where(and(eq(legs.contractId, c.id), inArray(legs.state, ["window_open", "attested"])));
    for (const leg of openLegs) result.push({ contract: c, leg });
  }
  return result;
}
// TODO(dixon-o): Implement advanced dispute resolution edge cases
