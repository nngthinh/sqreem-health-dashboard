import { describe, expect, it } from 'vitest'
import { assertBootable, parseEnv } from '../env'

const base = {
  NODE_ENV: 'development',
  LLM_PROVIDER: 'google',
  LLM_API_KEY: 'test-key',
  LLM_MODEL: 'gemini-3.8-flash',
  PORT: '8787',
  WEB_ORIGIN: 'http://localhost:5173',
  RATE_LIMIT_PER_MIN: '4',
  SESSION_SECRET: 's'.repeat(32),
  DATABASE_URL: 'postgres://health:health@localhost:5432/health',
  AUTH_MODE: 'sso',
}

describe('parseEnv', () => {
  it('accepts a minimal development configuration', () => {
    expect(parseEnv(base).authMode).toBe('sso')
  })

  it('refuses to boot in demo mode without an access code', () => {
    expect(() => parseEnv({ ...base, AUTH_MODE: 'demo' })).toThrow(/DEMO_ACCESS_CODE/)
  })

  it('refuses to boot in demo mode with a code shorter than 32 characters', () => {
    expect(() => parseEnv({ ...base, AUTH_MODE: 'demo', DEMO_ACCESS_CODE: 'short' })).toThrow(/32/)
  })

  it('accepts demo mode with a long enough code', () => {
    const env = parseEnv({ ...base, AUTH_MODE: 'demo', DEMO_ACCESS_CODE: 'c'.repeat(32) })
    expect(env.authMode).toBe('demo')
  })

  it('enables the dev bypass only when both conditions hold', () => {
    expect(parseEnv({ ...base, AUTH_DEV_BYPASS: 'true' }).devBypass).toBe(true)
    expect(parseEnv({ ...base, AUTH_DEV_BYPASS: 'false' }).devBypass).toBe(false)
    expect(parseEnv({ ...base }).devBypass).toBe(false)
  })

  it('ignores AUTH_DEV_BYPASS entirely in production', () => {
    const env = parseEnv({ ...base, NODE_ENV: 'production', AUTH_DEV_BYPASS: 'true' })
    expect(env.devBypass).toBe(false)
  })

  it('rejects a session secret shorter than 32 characters', () => {
    expect(() => parseEnv({ ...base, SESSION_SECRET: 'tooshort' })).toThrow()
  })
})

describe('assertBootable', () => {
  const google = {
    GOOGLE_CLIENT_ID: 'client-id',
    GOOGLE_CLIENT_SECRET: 'client-secret',
    GOOGLE_REDIRECT_URI: 'https://health.example/api/auth/callback',
  }

  it('refuses to boot production SSO without Google credentials', () => {
    const env = parseEnv({ ...base, NODE_ENV: 'production' })
    expect(() => assertBootable(env)).toThrow(/GOOGLE_CLIENT_ID/)
  })

  it('boots production SSO once Google credentials are present', () => {
    const env = parseEnv({ ...base, NODE_ENV: 'production', ...google })
    expect(() => assertBootable(env)).not.toThrow()
  })

  it('does not require Google credentials outside production', () => {
    expect(() => assertBootable(parseEnv(base))).not.toThrow()
  })

  it('does not require Google credentials in demo mode', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      AUTH_MODE: 'demo',
      DEMO_ACCESS_CODE: 'c'.repeat(32),
    })
    expect(() => assertBootable(env)).not.toThrow()
  })
})
