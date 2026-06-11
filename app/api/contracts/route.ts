import { z } from "zod";
import { createContract, listContractsBySender } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";
import { DEMO_SENDER } from "@/lib/seed";

const CreateSchema = z.object({
  schoolId: z.string().min(1),
  beneficiaryAdmissionNo: z.string().min(1),
  beneficiaryName: z.string().min(1),
  beneficiaryGrade: z.string().optional(),
  terms: z.number().int().min(1).max(3),
  fxHedge: z.boolean().optional(),
  senderId: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

  try {
    const result = await createContract({
      ...parsed.data,
      senderId: parsed.data.senderId ?? DEMO_SENDER.id,
    });
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create contract");
  }
}

export async function GET(req: Request) {
  const senderId = new URL(req.url).searchParams.get("senderId") ?? DEMO_SENDER.id;
  const rows = await listContractsBySender(senderId);
  return ok(rows);
}
