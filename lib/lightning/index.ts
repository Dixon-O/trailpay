import { generatePreimage, encryptPreimage, decryptPreimage, sha256 } from "../crypto";
import { config } from "../config";
import lndBackend from "./lnd";

/**
 * The Lightning backend interface. The hackathon ships the `mock` backend,
 * which performs the real cryptographic operations of a hodl invoice
 * (random preimage, SHA-256 payment hash, settle-by-preimage-reveal) without
 * a live LND node. Production swaps in a Voltage/LND backend implementing the
 * same interface via alex-bosworth's `lightning` package.
 */
export interface HodlInvoice {
  bolt11: string;
  paymentHash: string; // hex
  preimageEncrypted: string;
}

export interface LightningBackend {
  readonly name: string;
  createHodlInvoice(args: {
    amountSats: number;
    description: string;
    expirySeconds: number;
  }): Promise<HodlInvoice>;
  /** Reveal preimage to settle. Returns the revealed preimage (hex). */
  settle(preimageEncrypted: string): Promise<string>;
  /** Cancel a held invoice (triggers refund to payer). */
  cancel(paymentHash: string): Promise<void>;
  /** Verify a revealed preimage matches a payment hash. */
  verify(preimageHex: string, paymentHashHex: string): boolean;
}

function encodeMockBolt11(amountSats: number, paymentHash: string): string {
  // Realistic-looking testnet invoice string; not a routable invoice.
  const millisats = amountSats * 1000;
  const tag = paymentHash.slice(0, 52);
  return `lntb${millisats}p1${tag}trailpayhodl`;
}

const mockBackend: LightningBackend = {
  name: "mock",
  async createHodlInvoice({ amountSats, expirySeconds }) {
    void expirySeconds;
    const { preimage, paymentHash } = generatePreimage();
    const paymentHashHex = paymentHash.toString("hex");
    return {
      bolt11: encodeMockBolt11(amountSats, paymentHashHex),
      paymentHash: paymentHashHex,
      preimageEncrypted: encryptPreimage(preimage),
    };
  },
  async settle(preimageEncrypted) {
    const preimage = decryptPreimage(preimageEncrypted);
    return preimage.toString("hex");
  },
  async cancel() {
    // No-op for mock: the held invoice simply is never settled.
  },
  verify(preimageHex, paymentHashHex) {
    return sha256(Buffer.from(preimageHex, "hex")).toString("hex") === paymentHashHex;
  },
};

export function getLightning(): LightningBackend {
  switch (config.lightningBackend) {
    case "lnd":
    case "voltage":
    case "polar":
      // lndBackend connects lazily on first use, so importing it is cheap.
      return lndBackend;
    case "mock":
    default:
      return mockBackend;
  }
}
