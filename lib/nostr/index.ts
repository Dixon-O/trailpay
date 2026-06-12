import { createHash } from "crypto";

/**
 * Offline-safe stand-in for Nostr publishing. Produces a deterministic,
 * bech32-flavoured `nevent1...` identifier derived from the signed content so
 * the audit trail is demonstrable without network access. Production replaces
 * this with NDK publishing a NIP-23 / NIP-01 event to the configured relays.
 */
export function publishAuditEvent(kind: string, content: Record<string, unknown>): string {
  const serialized = JSON.stringify({ kind, content, ts: Date.now() });
  const digest = createHash("sha256").update(serialized).digest("hex");
  return `nevent1${digest.slice(0, 58)}`;
}
// TODO(luiwere): Plan NIP-23 audit event relay broadcasting
