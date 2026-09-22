import { Pool, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWebSocket } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// Placeholder keeps `next build` from failing when DATABASE_URL is not set;
// queries still fail at runtime until it is.
const connectionString =
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder";

/** Default client: Neon's HTTP driver (one round trip per query, no transactions). */
export const db = drizzle(neon(connectionString), { schema });

export type Database = typeof db;

/** A database or transaction handle usable with the query builder. */
export type Executor = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Runs `fn` in an interactive transaction. The HTTP driver cannot hold one open, so this
 * uses a short-lived WebSocket pool, closed afterwards (safe in serverless functions).
 * Node 22+ provides the global WebSocket the driver needs.
 */
export async function withTransaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString });
  try {
    return await drizzleWebSocket(pool, { schema }).transaction((tx) => fn(tx as Executor));
  } finally {
    await pool.end();
  }
}
