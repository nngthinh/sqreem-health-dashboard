import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseEnv } from '../../env'
import {
  claimsFromIdToken,
  createAuthorizationUrl,
  exchangeCodeForIdToken,
  generateCodeVerifier,
  generateState,
} from '../google'

const env = parseEnv({
  ...(process.env as Record<string, string | undefined>),
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:5173/api/auth/callback',
})
const unconfigured = parseEnv({
  ...(process.env as Record<string, string | undefined>),
  GOOGLE_CLIENT_ID: '',
})

const idTokenFor = (claims: Record<string, unknown>) =>
  `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`

afterEach(() => vi.restoreAllMocks())

describe('createAuthorizationUrl', () => {
  it('asks Google for an auth code with the PKCE challenge derived from the verifier', () => {
    const verifier = generateCodeVerifier()
    const url = new URL(createAuthorizationUrl(env, 'the-state', verifier))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'client-id',
      redirect_uri: 'http://localhost:5173/api/auth/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: 'the-state',
      code_challenge_method: 'S256',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    })
  })

  it('refuses when Google is not configured rather than building a broken URL', () => {
    expect(() => createAuthorizationUrl(unconfigured, 's', 'v')).toThrow(/not configured/)
  })

  it('generates distinct, unguessable state and verifier values', () => {
    expect(generateState()).not.toBe(generateState())
    expect(generateCodeVerifier().length).toBeGreaterThanOrEqual(43)
  })
})

describe('exchangeCodeForIdToken', () => {
  it('posts the code and verifier and returns only the id token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ id_token: 'the-id-token', access_token: 'a', refresh_token: 'r' }),
      )
    expect(await exchangeCodeForIdToken(env, 'the-code', 'the-verifier')).toBe('the-id-token')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://oauth2.googleapis.com/token')
    const sent = new URLSearchParams(init.body as URLSearchParams)
    expect(Object.fromEntries(sent)).toMatchObject({
      code: 'the-code',
      code_verifier: 'the-verifier',
      grant_type: 'authorization_code',
      client_secret: 'client-secret',
    })
  })

  it('throws when Google rejects the exchange', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad grant', { status: 400 }))
    await expect(exchangeCodeForIdToken(env, 'c', 'v')).rejects.toThrow(/400/)
  })

  it('throws when the response carries no id token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ access_token: 'a' }))
    await expect(exchangeCodeForIdToken(env, 'c', 'v')).rejects.toThrow(/no id_token/)
  })
})

describe('claimsFromIdToken', () => {
  it('reads the identity claims', () => {
    expect(
      claimsFromIdToken(
        idTokenFor({ sub: '123', email: 'a@example.com', name: 'A', picture: 'https://p' }),
      ),
    ).toEqual({ sub: '123', email: 'a@example.com', name: 'A', picture: 'https://p' })
  })

  it('falls back to the email when Google sends no name', () => {
    expect(claimsFromIdToken(idTokenFor({ sub: '123', email: 'a@example.com' })).name).toBe(
      'a@example.com',
    )
  })

  it.each([
    ['missing sub', { email: 'a@example.com' }],
    ['missing email', { sub: '123' }],
  ])('rejects a token %s', (_label, claims) => {
    expect(() => claimsFromIdToken(idTokenFor(claims))).toThrow(/missing sub or email/)
  })

  it('rejects a malformed token', () => {
    expect(() => claimsFromIdToken('not-a-jwt')).toThrow(/malformed/)
  })
})
