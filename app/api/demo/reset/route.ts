import { resetDatabase } from "@/lib/seed";
import { cancelAllOutstandingInvoices } from "@/lib/mmle";
import { ok } from "@/lib/http";

export async function POST() {
  // Release any held HTLCs back to the payer before wiping app state.
  await cancelAllOutstandingInvoices();
  const result = resetDatabase();
  return ok(result);
}
