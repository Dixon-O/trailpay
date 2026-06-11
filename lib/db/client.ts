import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_FILE ?? join(process.cwd(), "data", "pesashule.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

// Reuse a single connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };

const sqlite = globalForDb.__sqlite ?? new Database(DB_PATH);
if (!globalForDb.__sqlite) {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  initSchema(sqlite);
  globalForDb.__sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };

/** Idempotent schema creation — avoids a separate migration step for the demo. */
function initSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      phone_e164 TEXT,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'sender',
      country TEXT,
      ln_address TEXT,
      nostr_pubkey TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      logo_emoji TEXT DEFAULT '🏫',
      paybill_number TEXT NOT NULL,
      term_fee_local REAL NOT NULL,
      local_currency TEXT NOT NULL DEFAULT 'KES',
      admin_user_id TEXT REFERENCES users(id),
      attestation_pubkey TEXT,
      nostr_pubkey TEXT,
      verified_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      short_code TEXT NOT NULL UNIQUE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      school_id TEXT NOT NULL REFERENCES schools(id),
      beneficiary_admission_no TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      beneficiary_grade TEXT,
      beneficiary_pseudonym TEXT NOT NULL,
      contract_secret TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'draft',
      total_amount_sats INTEGER NOT NULL,
      total_amount_local REAL NOT NULL,
      local_currency TEXT NOT NULL DEFAULT 'KES',
      sender_currency TEXT NOT NULL DEFAULT 'USD',
      sender_amount REAL NOT NULL,
      fee_amount REAL NOT NULL,
      fx_hedge_enabled INTEGER DEFAULT 0,
      nostr_event_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS legs (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      sequence_index INTEGER NOT NULL,
      milestone_label TEXT NOT NULL,
      amount_sats INTEGER NOT NULL,
      amount_local REAL NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      payment_hash TEXT,
      preimage_encrypted TEXT,
      preimage_revealed TEXT,
      bolt11 TEXT,
      window_opens_at INTEGER NOT NULL,
      window_closes_at INTEGER NOT NULL,
      release_scheduled_at INTEGER,
      attested_at INTEGER,
      attested_by TEXT REFERENCES users(id),
      attestation_sig TEXT,
      released_at INTEGER,
      settled_at INTEGER,
      refunded_at INTEGER,
      disputed_at INTEGER,
      mpesa_receipt TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS leg_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      leg_id TEXT REFERENCES legs(id),
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload TEXT,
      nostr_event_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_legs_contract ON legs(contract_id);
    CREATE INDEX IF NOT EXISTS idx_legs_state ON legs(state);
    CREATE INDEX IF NOT EXISTS idx_events_contract ON leg_events(contract_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_sender ON contracts(sender_id);
    CREATE INDEX IF NOT EXISTS idx_contracts_school ON contracts(school_id);
  `);
}
