import { getContractFull } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = await getContractFull(id);
  if (!data) return fail("Contract not found", 404);
  return ok(data);
}
