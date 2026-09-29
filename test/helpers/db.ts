/**
 * In-memory Postgres (PGlite) with the real migrations applied, shaped like "@/lib/db".
 * Use as: vi.mock("@/lib/db", () => import("../helpers/db").then((m) => m.createTestDbModule()));
 */
export async function createTestDbModule() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const schema = await import("@/lib/db/schema");

  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });

  // PGlite runs one transaction at a time, which also serializes concurrent callers
  const withTransaction = <T>(fn: (tx: unknown) => Promise<T>) => db.transaction((tx) => fn(tx));
  return { db, withTransaction };
}
