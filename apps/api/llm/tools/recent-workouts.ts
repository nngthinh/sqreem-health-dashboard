import type { Dataset, Tool, ToolArgs, ToolResult } from './shared.js'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

function run({ records }: Dataset, args: ToolArgs): ToolResult {
  const requested = typeof args.limit === 'number' ? args.limit : DEFAULT_LIMIT
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested))

  const workouts = records
    .flatMap((record) => record.workouts.map((workout) => ({ ...workout, date: record.date })))
    .slice(-limit)
    .reverse()

  if (workouts.length === 0) return { ok: false, reason: 'no_data', detail: 'No workouts logged.' }

  return { ok: true, workouts }
}

export const recentWorkoutsTool: Tool = {
  definition: {
    name: 'get_recent_workouts',
    description: 'The most recent logged workouts, newest first.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: `default ${DEFAULT_LIMIT}, max ${MAX_LIMIT}` },
      },
    },
  },
  run,
}
