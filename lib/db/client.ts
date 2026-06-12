import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon (serverless Postgres) client — works both locally and on Vercel.
 * Set DATABASE_URL to your Neon pooled connection string (.env.local locally,
 * Vercel env var in production). The placeholder keeps `next build` from
 * throwing at import time; real queries fail loudly if DATABASE_URL is unset.
 */
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost/placeholder";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
