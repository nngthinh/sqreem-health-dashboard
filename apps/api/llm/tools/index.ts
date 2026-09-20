import { getDatasetFor } from '@health/shared/data'
import type { ToolDef } from '../types.js'
import { comparePeriodsTool } from './compare-periods.js'
import { goalProgressTool } from './goal-progress.js'
import { metricSeriesTool } from './metric-series.js'
import { recentWorkoutsTool } from './recent-workouts.js'
import type { Tool, ToolArgs, ToolResult } from './shared.js'

export type { ToolFailure, ToolResult } from './shared.js'

/** Bounds latency, bounds free-tier quota, and bounds a confused model querying in circles. */
export const MAX_TOOL_ROUNDS = 4

/** The tool set: one entry per file, so attaching or removing a tool is a one-line change. */
const TOOLS: Tool[] = [metricSeriesTool, comparePeriodsTool, recentWorkoutsTool, goalProgressTool]

const BY_NAME = new Map(TOOLS.map((tool) => [tool.definition.name, tool]))

export const TOOL_DEFS: ToolDef[] = TOOLS.map((tool) => tool.definition)

/**
 * Every failure is an explicit, machine-readable "we do not have that" — an unknown id
 * comes back with the ids that do exist, so the model self-corrects instead of inventing.
 */
export async function runTool(
  userId: string,
  name: string,
  rawArgs: unknown,
  today?: string,
): Promise<ToolResult> {
  const tool = BY_NAME.get(name)

  if (!tool) {
    return { ok: false, reason: 'unknown_metric', detail: `No tool named ${name}.` }
  }

  const { records, goals } = getDatasetFor(userId, today)

  return tool.run({ records, goals }, (rawArgs ?? {}) as ToolArgs)
}
