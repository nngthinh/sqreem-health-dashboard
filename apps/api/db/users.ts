import { eq } from 'drizzle-orm'
import { db } from './client'
import { users } from './schema'

export type User = {
  id: string
  googleSub: string
  email: string
  name: string
  picture: string | null
}

export async function upsertGoogleUser(input: {
  googleSub: string
  email: string
  name: string
  picture: string | null
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.googleSub,
      set: { email: input.email, name: input.name, picture: input.picture },
    })
    .returning()
  if (!row) throw new Error('upsertGoogleUser returned no row')
  return row
}

/** Used by the dev bypass (`dev:local`) and demo mode (`demo:shared`) alike — both are ordinary rows. */
export async function getOrCreateFixedUser(
  googleSub: string,
  email: string,
  name: string,
): Promise<User> {
  const existing = await db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1)
  if (existing[0]) return existing[0]
  return upsertGoogleUser({ googleSub, email, name, picture: null })
}
