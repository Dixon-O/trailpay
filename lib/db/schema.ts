import { pgTable, text, integer, real, boolean, timestamp, serial, jsonb } from "drizzle-orm/pg-core";

/**
 * Postgres (Neon) schema. Timestamps are real `timestamp` columns returning
 * Date objects; booleans are native; the leg_events PK is a serial. IDs are
 * text UUIDs generated app-side for portability.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () => timestamp("created_at").notNull().defaultNow();

export const users = pgTable("users", {
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

export const schools = pgTable("schools", {
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
  verifiedAt: timestamp("verified_at"),
  createdAt: createdAt(),
});

export const contracts = pgTable("contracts", {
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
  totalAmountSats: integer("total_amount_sats").notNull(),
  totalAmountLocal: real("total_amount_local").notNull(),
  localCurrency: text("local_currency").notNull().default("KES"),
  senderCurrency: text("sender_currency").notNull().default("USD"),
  senderAmount: real("sender_amount").notNull(),
  feeAmount: real("fee_amount").notNull(),
  fxHedgeEnabled: boolean("fx_hedge_enabled").default(false),
  nostrEventId: text("nostr_event_id"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const legs = pgTable("legs", {
  id: id(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id),
  sequenceIndex: integer("sequence_index").notNull(),
  milestoneLabel: text("milestone_label").notNull(),
  amountSats: integer("amount_sats").notNull(),
  amountLocal: real("amount_local").notNull(),
  state: text("state").notNull().default("pending"),
  // pending | window_open | attested | released | settled | disputed | refund_initiated | refunded | cancelled
  paymentHash: text("payment_hash"),
  preimageEncrypted: text("preimage_encrypted"),
  preimageRevealed: text("preimage_revealed"),
  bolt11: text("bolt11"),
  windowOpensAt: timestamp("window_opens_at").notNull(),
  windowClosesAt: timestamp("window_closes_at").notNull(),
  releaseScheduledAt: timestamp("release_scheduled_at"),
  attestedAt: timestamp("attested_at"),
  attestedBy: text("attested_by").references(() => users.id),
  attestationSig: text("attestation_sig"),
  releasedAt: timestamp("released_at"),
  settledAt: timestamp("settled_at"),
  refundedAt: timestamp("refunded_at"),
  disputedAt: timestamp("disputed_at"),
  mpesaReceipt: text("mpesa_receipt"),
  createdAt: createdAt(),
});

export const legEvents = pgTable("leg_events", {
  id: serial("id").primaryKey(),
  legId: text("leg_id").references(() => legs.id),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull(), // sender | school_admin | system | lnd | bitnob
  payload: jsonb("payload").$type<Record<string, unknown>>(),
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
