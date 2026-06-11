import { attestLeg } from "@/lib/mmle";
import { getDemoSchoolAdmin } from "@/lib/seed";
import { db } from "@/lib/db/client";
import { legs, contracts } from "@/lib/db/schema";
import { ok, fail } from "@/lib/http";
import { eq } from "drizzle-orm";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const leg = await db.query.legs.findFirst({ where: eq(legs.id, id) });
    if (!leg) return fail("Leg not found", 404);
    const contract = await db.query.contracts.findFirst({
      where: eq(contracts.id, leg.contractId),
    });
    if (!contract) return fail("Contract not found", 404);
    const adminId = await getDemoSchoolAdmin(contract.schoolId);
    const updated = await attestLeg(id, adminId);
    return ok(updated);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Attestation failed");
  }
}
