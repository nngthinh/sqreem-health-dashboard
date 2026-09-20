import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './apps/api/db/schema.ts',
  out: './apps/api/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '' },
})
