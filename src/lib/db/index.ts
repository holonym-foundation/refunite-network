import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Placeholder keeps `next build` from failing when DATABASE_URL is not set;
// queries still fail at runtime until it is.
const sql = neon(
  process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost/placeholder"
);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
