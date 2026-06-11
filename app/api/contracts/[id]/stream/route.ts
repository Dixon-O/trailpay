import { getContractFull } from "@/lib/mmle";

export const dynamic = "force-dynamic";

/** Server-Sent Events stream of a contract's live state. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        const data = await getContractFull(id);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      await send();
      const interval = setInterval(async () => {
        try {
          await send();
        } catch {
          clearInterval(interval);
        }
      }, 1000);
      // @ts-expect-error attach for cancel
      controller._interval = interval;
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
