import {
  authenticatedLndGrpc,
  createHodlInvoice,
  settleHodlInvoice,
  cancelHodlInvoice,
  payViaPaymentRequest,
  getInvoice,
} from "lightning";
import { generatePreimage, encryptPreimage, decryptPreimage, sha256 } from "../crypto";
import { config } from "../config";
import type { LightningBackend } from "./index";

type Lnd = ReturnType<typeof authenticatedLndGrpc>["lnd"];

let payeeLnd: Lnd | null = null;
let payerLnd: Lnd | null = null;

function connect() {
  if (!payeeLnd) {
    payeeLnd = authenticatedLndGrpc({
      socket: config.lnd.payee.socket,
      cert: config.lnd.payee.cert,
      macaroon: config.lnd.payee.macaroon,
    }).lnd;
  }
  if (!payerLnd) {
    payerLnd = authenticatedLndGrpc({
      socket: config.lnd.payer.socket,
      cert: config.lnd.payer.cert,
      macaroon: config.lnd.payer.macaroon,
    }).lnd;
  }
  return { payee: payeeLnd, payer: payerLnd };
}

async function waitUntilHeld(lnd: Lnd, id: string, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const inv = await getInvoice({ lnd, id });
      if (inv.is_held) return true;
    } catch {
      /* not found yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * Real hodl-invoice backend. The payee node issues the hodl invoice; the payer
 * node pays it (fire-and-forget) so the HTLC is genuinely locked/held. Settling
 * reveals the preimage and completes the payer's payment; cancelling fails it
 * back (refund).
 */
const lndBackend: LightningBackend = {
  name: "lnd",

  async createHodlInvoice({ amountSats, description, expirySeconds }) {
    const { payee, payer } = connect();
    const { preimage, paymentHash } = generatePreimage();
    const paymentHashHex = paymentHash.toString("hex");

    const invoice = await createHodlInvoice({
      lnd: payee,
      id: paymentHashHex,
      tokens: amountSats,
      description,
      expires_at: new Date(Date.now() + expirySeconds * 1000).toISOString(),
    });

    // Payer locks the HTLC. This promise stays pending until we settle (resolves)
    // or cancel (rejects) — exactly the hodl semantics. Swallow the rejection.
    payViaPaymentRequest({ lnd: payer, request: invoice.request }).catch(() => {});

    await waitUntilHeld(payee, paymentHashHex);

    return {
      bolt11: invoice.request,
      paymentHash: paymentHashHex,
      preimageEncrypted: encryptPreimage(preimage),
    };
  },

  async settle(preimageEncrypted) {
    const { payee } = connect();
    const preimage = decryptPreimage(preimageEncrypted);
    await settleHodlInvoice({ lnd: payee, secret: preimage.toString("hex") });
    return preimage.toString("hex");
  },

  async cancel(paymentHash) {
    const { payee } = connect();
    await cancelHodlInvoice({ lnd: payee, id: paymentHash });
  },

  verify(preimageHex, paymentHashHex) {
    return sha256(Buffer.from(preimageHex, "hex")).toString("hex") === paymentHashHex;
  },
};

export default lndBackend;
