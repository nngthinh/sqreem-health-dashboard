import { decodeIdToken, Google } from 'arctic'
import type { Env } from '../env'

export type GoogleClaims = { sub: string; email: string; name: string; picture?: string }

export function googleClient(env: Env) {
  if (!env.google) throw new Error('Google OAuth is not configured')
  return new Google(env.google.clientId, env.google.clientSecret, env.google.redirectUri)
}

export function claimsFromIdToken(idToken: string): GoogleClaims {
  const claims = decodeIdToken(idToken) as Record<string, unknown>
  const sub = typeof claims.sub === 'string' ? claims.sub : null
  const email = typeof claims.email === 'string' ? claims.email : null
  if (!sub || !email) throw new Error('Google ID token is missing sub or email')
  return {
    sub,
    email,
    name: typeof claims.name === 'string' ? claims.name : email,
    picture: typeof claims.picture === 'string' ? claims.picture : undefined,
  }
}
