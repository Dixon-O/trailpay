import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
  createHmac,
} from "crypto";
import { config } from "./config";

/** Derive a stable 32-byte key from the configured secret. */
const KEY = scryptSync(config.preimageKey, "trailpay.salt.v1", 32);

export function sha256(data: Buffer | string): Buffer {
  return createHash("sha256").update(data).digest();
}

/** Generate a 32-byte Lightning preimage and its payment hash. */
export function generatePreimage(): { preimage: Buffer; paymentHash: Buffer } {
  const preimage = randomBytes(32);
  return { preimage, paymentHash: sha256(preimage) };
}

/**
 * Encrypt a preimage at rest (AES-256-GCM). In production the key lives in a
 * KMS; here it is derived from an env secret. Format: iv:tag:ciphertext (hex).
 */
export function encryptPreimage(preimage: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(preimage), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptPreimage(blob: string): Buffer {
  const [ivHex, tagHex, dataHex] = blob.split(":");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
}

/**
 * Stand-in for a school admin's WebAuthn assertion. Production replaces this
 * with a real passkey signature verified against the stored public key.
 */
export function attestationSignature(legId: string, adminId: string): string {
  return createHmac("sha256", KEY)
    .update(`${legId}:${adminId}:${Date.now()}`)
    .digest("hex");
}

/** Opaque, privacy-preserving beneficiary reference for the public audit log. */
export function beneficiaryPseudonym(admissionNo: string, contractSecret: string): string {
  return createHmac("sha256", KEY)
    .update(`${admissionNo}:${contractSecret}`)
    .digest("hex")
    .slice(0, 16);
}
