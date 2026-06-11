"use client";

import { useEffect, useState } from "react";
import type { ContractFull } from "@/lib/types";

/** Subscribe to a contract's SSE stream with a polling fallback. */
export function useContractStream(id: string) {
  const [data, setData] = useState<ContractFull | null>(null);

  useEffect(() => {
    if (!id) return;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    try {
      es = new EventSource(`/api/contracts/${id}/stream`);
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) setData(parsed);
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        if (!poll) {
          poll = setInterval(() => {
            fetch(`/api/contracts/${id}`)
              .then((r) => r.json())
              .then((j) => j.ok && setData(j.data))
              .catch(() => {});
          }, 1500);
        }
      };
    } catch {
      poll = setInterval(() => {
        fetch(`/api/contracts/${id}`)
          .then((r) => r.json())
          .then((j) => j.ok && setData(j.data));
      }, 1500);
    }

    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [id]);

  return data;
}
