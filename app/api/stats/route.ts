import { db } from "@/lib/db/client";
import { legEvents } from "@/lib/db/schema";
import { ok } from "@/lib/http";
import { eq } from "drizzle-orm";

/** Aggregate "diversion prevented" stat for the landing-page counter. */
export async function GET() {
  const settled = await db
    .select()
    .from(legEvents)
    .where(eq(legEvents.eventType, "settled"));

  let totalLocal = 0;
  for (const e of settled) {
    const p = e.payload as { amountLocal?: number } | null;
    if (p?.amountLocal) totalLocal += p.amountLocal;
  }
  return ok({
    settledCount: settled.length,
    totalDeliveredLocal: Math.round(totalLocal),
    currency: "KES",
  });
}
