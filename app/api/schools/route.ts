import { db } from "@/lib/db/client";
import { schools } from "@/lib/db/schema";
import { ok } from "@/lib/http";
import { like, or } from "drizzle-orm";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const rows = q
    ? await db
        .select()
        .from(schools)
        .where(or(like(schools.name, `%${q}%`), like(schools.city, `%${q}%`)))
    : await db.select().from(schools);
  return ok(rows);
}
