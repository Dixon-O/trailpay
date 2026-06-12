import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * SQLite schema for the local/hackathon demo. The column shapes mirror the
 * production Postgres/Drizzle schema in the implementation plan so the
 * migration to Neon is a backend swap, not a redesign.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").unique(),
  phoneE164: text("phone_e164"),
  displayName: text("display_name"),
  role: text("role").notNull().default("sender"), // sender | school_admin | admin
  country: text("country"),
  lnAddress: text("ln_address"),
  nostrPubkey: text("nostr_pubkey"),
  createdAt: createdAt(),
});

export const schools = sqliteTable("schools", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  logoEmoji: text("logo_emoji").default("🏫"),
  paybillNumber: text("paybill_number").notNull(),
  termFeeLocal: real("term_fee_local").notNull(),
  localCurrency: text("local_currency").notNull().default("KES"),
  adminUserId: text("admin_user_id").references(() => users.id),
  attestationPubkey: text("attestation_pubkey"),
  nostrPubkey: text("nostr_pubkey"),
  verifiedAt: integer("verified_at", { mode: "timestamp_ms" }),
  createdAt: createdAt(),
});

export const contracts = sqliteTable("contracts", {
  id: id(),
  shortCode: text("short_code").notNull().unique(),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  schoolId: text("school_id")
    .notNull()
    .references(() => schools.id),
  beneficiaryAdmissionNo: text("beneficiary_admission_no").notNull(),
  beneficiaryName: text("beneficiary_name").notNull(),
  beneficiaryGrade: text("beneficiary_grade"),
  beneficiaryPseudonym: text("beneficiary_pseudonym").notNull(),
  contractSecret: text("contract_secret").notNull(),
  state: text("state").notNull().default("draft"),
  // draft | awaiting_payment | funded | active | completed | partially_refunded | fully_refunded | cancelled
  totalAmountSats: integer("total_amount_sats", { mode: "number" }).notNull(),
  totalAmountLocal: real("total_amount_local").notNull(),
  localCurrency: text("local_currency").notNull().default("KES"),
  senderCurrency: text("sender_currency").notNull().default("USD"),
  senderAmount: real("sender_amount").notNull(),
  feeAmount: real("fee_amount").notNull(),
  fxHedgeEnabled: integer("fx_hedge_enabled", { mode: "boolean" }).default(false),
  nostrEventId: text("nostr_event_id"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const legs = sqliteTable("legs", {
  id: id(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id),
  sequenceIndex: integer("sequence_index").notNull(),
  milestoneLabel: text("milestone_label").notNull(),
  amountSats: integer("amount_sats", { mode: "number" }).notNull(),
  amountLocal: real("amount_local").notNull(),
  state: text("state").notNull().default("pending"),
  // pending | window_open | attested | released | settled | disputed | refund_initiated | refunded | cancelled
  paymentHash: text("payment_hash"),
  preimageEncrypted: text("preimage_encrypted"),
  preimageRevealed: text("preimage_revealed"),
  bolt11: text("bolt11"),
  windowOpensAt: integer("window_opens_at", { mode: "timestamp_ms" }).notNull(),
  windowClosesAt: integer("window_closes_at", { mode: "timestamp_ms" }).notNull(),
  releaseScheduledAt: integer("release_scheduled_at", { mode: "timestamp_ms" }),
  attestedAt: integer("attested_at", { mode: "timestamp_ms" }),
  attestedBy: text("attested_by").references(() => users.id),
  attestationSig: text("attestation_sig"),
  releasedAt: integer("released_at", { mode: "timestamp_ms" }),
  settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  refundedAt: integer("refunded_at", { mode: "timestamp_ms" }),
  disputedAt: integer("disputed_at", { mode: "timestamp_ms" }),
  mpesaReceipt: text("mpesa_receipt"),
  createdAt: createdAt(),
});

export const legEvents = sqliteTable("leg_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legId: text("leg_id").references(() => legs.id),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull(), // sender | school_admin | system | lnd | bitnob
  payload: text("payload", { mode: "json" }),
  nostrEventId: text("nostr_event_id"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Leg = typeof legs.$inferSelect;
export type LegEvent = typeof legEvents.$inferSelect;

export type LegState = Leg["state"];
export type ContractState = Contract["state"];
