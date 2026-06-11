import { openWindow } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";

/** Demo control: force-open a term's redemption window early. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return ok(await openWindow(id));
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Open failed");
  }
}
