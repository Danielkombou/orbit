import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return postgres(connectionString);
}

export function getDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

// Lazy proxy so `db` can be used as a direct import
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, _receiver) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema.js";
