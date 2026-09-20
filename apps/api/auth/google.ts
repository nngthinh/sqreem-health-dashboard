import { createHash, randomBytes } from 'node:crypto'
import type { Env } from '../env'

/**
 * Google's OAuth flow, by hand. `arctic` was deprecated in July 2026 and its author's
 * advice was to inline the handful of calls rather than find a successor — which is all
 * this ever was: build an authorization URL, exchange the code, read the ID token.
 */
const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SCOPES = ['openid', 'email', 'profile']

export type GoogleClaims = { sub: string; email: string; name: string; picture?: string }

const base64url = (bytes: Buffer) => bytes.toString('base64url')

export function generateState(): string {
  return base64url(randomBytes(32))
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32))
}

function googleConfig(env: Env) {
  if (!env.google) throw new Error('Google OAuth is not configured')
  return env.google
}

export function createAuthorizationUrl(env: Env, state: string, codeVerifier: string): string {
  const { clientId, redirectUri } = googleConfig(env)
  const url = new URL(AUTHORIZATION_ENDPOINT)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    code_challenge: base64url(createHash('sha256').update(codeVerifier).digest()),
    code_challenge_method: 'S256',
  }).toString()
  return url.toString()
}

/**
 * Returns only the ID token: the access and refresh tokens are deliberately dropped —
 * we never call Google again once we know who signed in.
 */
export async function exchangeCodeForIdToken(
  env: Env,
  code: string,
  codeVerifier: string,
): Promise<string> {
  const { clientId, clientSecret, redirectUri } = googleConfig(env)
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`)
  }
  const body = (await res.json()) as { id_token?: unknown }
  if (typeof body.id_token !== 'string') {
    throw new Error('Google token response has no id_token')
  }
  return body.id_token
}

/**
 * Decode without signature verification, which the OpenID Connect Core spec permits here:
 * the token came straight from Google's token endpoint over TLS in answer to our own
 * code and verifier, so there is no untrusted party in between to forge it.
 */
export function claimsFromIdToken(idToken: string): GoogleClaims {
  const payload = idToken.split('.')[1]
  if (!payload) throw new Error('Google ID token is malformed')
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >
  const sub = typeof claims.sub === 'string' ? claims.sub : null
  const email = typeof claims.email === 'string' ? claims.email : null
  if (!sub || !email) throw new Error('Google ID token is missing sub or email')
  return {
    sub,
    email,
    name: typeof claims.name === 'string' ? claims.name : email,
    // Omitted rather than set to undefined: `picture` is optional, and under
    // exactOptionalPropertyTypes those are not the same thing.
    ...(typeof claims.picture === 'string' ? { picture: claims.picture } : {}),
  }
}
