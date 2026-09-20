import type { Goal, Persona } from '../schema'

export const MAYA: Persona = {
  userId: 'maya-chen',
  name: 'Maya Chen',
  age: 34,
  occupation: 'Senior Product Manager',
  location: 'Singapore',
  initials: 'MC',
  narrative:
    'Desk job, wears a fitness band. Spent the last year heads-down on a launch and let her routine slide; three months into rebuilding it and wants to know whether it is actually working.',
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
