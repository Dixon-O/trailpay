import { listPendingAttestations } from "@/lib/mmle";
import { db } from "@/lib/db/client";
import { schools } from "@/lib/db/schema";
import { ok, fail } from "@/lib/http";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
  if (!school) return fail("School not found", 404);
  const pending = await listPendingAttestations(schoolId);
  return ok({ school, pending });
}
