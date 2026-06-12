import { processTick } from "@/lib/mmle";
import { ok, fail } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron entrypoint for the MMLE state machine (replaces the local
 * setInterval ticker). Scheduled in vercel.json. Vercel automatically sends an
 * `Authorization: Bearer ${CRON_SECRET}` header to cron invocations; we verify
 * it so the endpoint can't be triggered by the public.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return fail("Unauthorized", 401);
  }
  try {
    await processTick();
    return ok({ ticked: true, at: new Date().toISOString() });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "tick failed", 500);
  }
}
