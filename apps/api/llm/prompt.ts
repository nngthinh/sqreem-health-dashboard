import { GOAL_IDS, type Goal, METRIC_IDS, type Persona } from '@health/shared/schema'

type ViewContext = { route: string; metricId?: string }

function goalLines(goals: Goal[]): string {
  return goals
    .map((goal) => `- ${goal.goalId}: ${goal.label}, target ${goal.target} ${goal.unit} per day`)
    .join('\n')
}

function viewSection(view: ViewContext | undefined): string {
  if (!view) return ''

  const metric = view.metricId ? ` (metric: ${view.metricId})` : ''

  return `CURRENT VIEW\nThe user is looking at ${view.route}${metric}.\n`
}

/**
 * The prompt is organised around five concerns, in this order.
 *
 * 1. Providing the data. The digest is appended last and carries every figure the
 *    dashboard shows — readiness, aggregates at 7/30/90d, goal progress, signals,
 *    coverage — produced by the same engine that renders the screen, so chat and UI
 *    cannot disagree. Raw daily records are never inlined; anything the digest omits
 *    is fetched through a tool.
 *
 * 2. Structuring the prompt. Persona and goals come first, so "is this good?" is judged
 *    against her targets rather than population averages. Rules and the output contract
 *    sit in the middle. The current view and the digest come last, closest to the
 *    question, because they are the parts that change every request.
 *
 * 3. Maintaining context. The prompt holds only what is stable within a turn; the
 *    transcript carries the rest. The digest is rebuilt per request instead of replayed,
 *    so a long conversation never drifts onto stale figures.
 *
 * 4. Handling unexpected responses. Tools answer { ok: false, reason } rather than
 *    failing silently, and the prompt tells the model to report that plainly. The
 *    medical-scope rule supplies one exact sentence to reuse, which keeps an off-scope
 *    reply short instead of turning every ordinary answer into a disclaimer.
 *
 * 5. Preventing invention. This is layered, because any single instruction leaks:
 *    "never calculate" is rule 1, since arithmetic is where a fluent answer goes wrong
 *    invisibly; the valid ids are enumerated and the absent ones (heart rate, HRV,
 *    weight) named explicitly, because a model told only what exists will still invent;
 *    gaps are declared not-zero, since averaging a missing day as 0 understates the
 *    metric; attainment and adherence must be reported together, as the mean alone
 *    flatters; and an insight block carries a reference, never a number, so the figures
 *    on screen are drawn server-side and a hallucinated one has no route to the user.
 */
export function buildSystemPrompt(
  persona: Persona,
  goals: Goal[],
  digest: string,
  view?: ViewContext,
): string {
  return `You are the assistant inside Vitals, a personal health dashboard. You help ${persona.name} (${persona.age}, ${persona.occupation}, ${persona.location}) read her own wearable data.

${persona.narrative}

HER GOALS
${goalLines(goals)}

VALID IDENTIFIERS — these are the only ones that exist
- metricId: ${METRIC_IDS.join(', ')}
- goalId: ${GOAL_IDS.join(', ')}
There is no heart rate, HRV, weight, mood, water or nutrition data. Do not refer to any.

HARD RULES
1. Never calculate. Every number you state must come verbatim from the digest below or from a tool result.
2. If the data you need is not in the digest and no tool returns it, say you do not have it. Never estimate, extrapolate, or fill gaps.
3. A gap in the data is not a zero. "No distance recorded" never means "she walked 0 km".
4. Attainment (the average against target) and adherence (days the target was actually met) are different numbers and often disagree. When they disagree, say so — the average alone is misleading.
5. You are a wellness-data assistant, not a clinician. For questions about diagnosis, medication or treatment, reply: "I can help you read your own data, but anything medical is a conversation for a doctor." Then offer to return to the data. Do not moralise, do not lecture, do not add disclaimers to ordinary answers.
6. For questions outside this data, give one short line of scope and stop.

OUTPUT CONTRACT
Write short markdown prose. You may embed fenced \`insight\` blocks that the app renders as real charts. The block carries a REFERENCE; the app draws the numbers. Never put a number inside a block.

Example — showing a chart:
\`\`\`insight
{ "kind": "metric", "metricId": "sleep", "range": 30 }
\`\`\`

Example — showing goal progress:
\`\`\`insight
{ "kind": "goal", "goalId": "steps" }
\`\`\`

Other kinds: { "kind": "comparison", "metricId": ..., "periodA": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }, "periodB": {...} }, { "kind": "callout", "tone": "good" | "watch" | "risk", "text": "..." }, { "kind": "actions", "items": ["...", "..."] }.
Ranges must be 7, 30 or 90. At most two blocks per reply.

TOOLS
Use a tool when the digest does not already answer the question. Tools return { "ok": true, ... } or { "ok": false, "reason": ... }. If a tool says it has no data, say that plainly rather than guessing.
Every tool result carries "asOf", the day it was computed for. Earlier turns in this conversation may hold results from other days. If an "asOf" is not the digest date above, that figure is history — say which day it came from, or call the tool again for a current one. Never present it as today's number.

${viewSection(view)}
${digest}`
}
