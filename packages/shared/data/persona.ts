import type { Goal, Persona } from '../schema'

/** Two letters at most: more than that is a name badge, not an avatar. */
function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?'
}

export const DANIEL: Persona = {
  userId: 'daniel-tan',
  name: 'Daniel Tan',
  age: 34,
  gender: 'male',
  occupation: 'Senior Product Manager',
  location: 'Singapore',
  initials: 'DT',
  narrative:
    'Desk job, wears a fitness band. Spent the last year heads-down on a launch and let his routine slide; three months into rebuilding it and wants to know whether it is actually working.',
}

export const GOALS: Goal[] = [
  {
    goalId: 'steps',
    metricId: 'steps',
    label: 'Steps',
    target: 8000,
    unit: 'steps',
    cadence: 'day',
  },
  { goalId: 'sleep', metricId: 'sleep', label: 'Sleep', target: 7.5, unit: 'h', cadence: 'day' },
  {
    goalId: 'calories',
    metricId: 'calories',
    label: 'Active calories',
    target: 500,
    unit: 'kcal',
    cadence: 'day',
  },
]

export function personaFor(identity: { name?: string | null; email?: string | null }): Persona {
  const name = identity.name?.trim() || identity.email?.split('@')[0] || DANIEL.name

  return { ...DANIEL, name, initials: initialsOf(name) }
}
