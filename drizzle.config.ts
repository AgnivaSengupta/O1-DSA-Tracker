import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const isTurso = process.env.DB_FILE_NAME?.startsWith('libsql://');

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: isTurso ? 'turso' : 'sqlite',
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
    authToken: process.env.DB_AUTH_TOKEN,
  },
});
