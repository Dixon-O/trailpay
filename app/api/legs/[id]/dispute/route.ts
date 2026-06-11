import { disputeLeg } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return ok(await disputeLeg(id));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Dispute failed");
  }
}
