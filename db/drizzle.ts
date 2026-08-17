import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle } from "drizzle-orm/neon-http";
import { schema } from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Please add it to your environment variables.",
    );
  }

  const sql = neon(process.env.DATABASE_URL);
  _db = drizzle({ client: sql, schema });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof NeonHttpDatabase<typeof schema>];
  },
});
