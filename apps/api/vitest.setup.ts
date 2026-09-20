process.env.LLM_API_KEY ??= 'test-key'
process.env.SESSION_SECRET ??= 's'.repeat(32)
process.env.DATABASE_URL ??= 'postgres://health:health@localhost:5432/health'
