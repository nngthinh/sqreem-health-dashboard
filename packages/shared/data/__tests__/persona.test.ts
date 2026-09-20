import { describe, expect, it } from 'vitest'
import { DANIEL, personaFor } from '../persona'

describe('personaFor', () => {
  it('names the persona after the signed-in account', () => {
    const persona = personaFor({ name: 'Ada Lovelace', email: 'ada@example.com' })

    expect(persona.name).toBe('Ada Lovelace')
    expect(persona.initials).toBe('AL')
  })

  it('keeps the fixture body the data actually belongs to', () => {
    const persona = personaFor({ name: 'Ada Lovelace' })

    expect(persona.narrative).toBe(DANIEL.narrative)
    expect(persona.age).toBe(DANIEL.age)
  })

  it('falls back to the mailbox when the account carries no name', () => {
    expect(personaFor({ name: '  ', email: 'ada@example.com' }).name).toBe('ada')
  })

  it('falls back to the fixture when the account carries nothing', () => {
    expect(personaFor({}).name).toBe(DANIEL.name)
  })
})
