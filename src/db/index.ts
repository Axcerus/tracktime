import * as schema from "./schema";

let localDbInstance: any = null;

export async function getDb() {
  try {
    // Check if running inside Cloudflare runtime
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as { DB?: any } | undefined;
    if (env?.DB) {
      const { drizzle: drizzleD1 } = await import("drizzle-orm/d1");
      return drizzleD1(env.DB, { schema });
    }
  } catch {
    // Cloudflare context not available (running in Node dev or CLI)
  }

  if (!localDbInstance) {
    const Database = (await import("better-sqlite3")).default;
    const path = await import("path");
    
    const dbPath = path.resolve(process.cwd(), "tracktimer.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY NOT NULL,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        created_at integer NOT NULL
      );
      CREATE TABLE IF NOT EXISTS time_entries (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        description text,
        start_time integer NOT NULL,
        end_time integer,
        created_at integer NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    const { drizzle: drizzleSqlite } = await import("drizzle-orm/better-sqlite3");
    localDbInstance = drizzleSqlite(sqlite, { schema });
  }

  return localDbInstance;
}
