import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL tanımlı değil. .env.local dosyanı kontrol et.");
}

export const db = new Pool({
  connectionString,
});
