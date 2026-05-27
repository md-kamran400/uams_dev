import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
const poolInstance = connectionString
  ? new Pool({ connectionString })
  : new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
    });

if (
  !connectionString &&
  (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME)
) {
  throw new Error(
    "DATABASE_URL or DB_USER/DB_PASSWORD/DB_NAME must be set in .env",
  );
}

export const pool = poolInstance;
export const db = drizzle({ client: pool, schema });
