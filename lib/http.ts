import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function handle<T>(fn: () => Promise<T>) {
  return fn().then(ok).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return fail(msg, 400);
  });
}
