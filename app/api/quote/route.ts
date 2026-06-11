import { db } from "@/lib/db/client";
import { schools } from "@/lib/db/schema";
import { quoteContract } from "@/lib/pricing";
import { ok, fail } from "@/lib/http";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const schoolId = url.searchParams.get("schoolId");
  const terms = Number(url.searchParams.get("terms") ?? "3");
  const fxHedge = url.searchParams.get("fxHedge") === "true";
  if (!schoolId) return fail("schoolId required");

  const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
  if (!school) return fail("School not found", 404);

  const quote = quoteContract({
    termFeeLocal: school.termFeeLocal,
    terms: Math.max(1, Math.min(3, terms)),
    localCurrency: school.localCurrency,
    fxHedge,
  });
  return ok(quote);
}
