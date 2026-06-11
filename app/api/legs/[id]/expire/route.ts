import { demoExpireWindow } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";

/** Demo control: simulate a redemption window closing unredeemed (auto-refund). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return ok(await demoExpireWindow(id));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Expire failed");
  }
}
