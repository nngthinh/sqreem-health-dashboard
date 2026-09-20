const WHOLE_MESSAGE_FENCE = /^```([a-zA-Z]*)\n([\s\S]*)\n```$/

/**
 * Models often wrap an entire reply in a ```markdown fence. Rendered naively that
 * produces one giant code block instead of prose. Strip a fence that opens at the
 * first character and closes at the last; leave every other fence alone.
 */
export function stripWholeMessageFence(markdown: string): string {
  const match = WHOLE_MESSAGE_FENCE.exec(markdown.trim())
  if (!match) return markdown

  const [, language = '', body = ''] = match

  // Insight fences carry the blocks the renderer draws, so they must reach it intact.
  if (language === 'insight') return markdown

  // A body of its own fences is two code blocks, not one wrapper around prose.
  if (body.includes('```')) return markdown

  return body
}

/** Mirrors the extractor's fence pattern, so prose loses exactly what blocks claim. */
const INSIGHT_FENCE = /^[ \t]*`{3,}insight\b[^\n]*\n[\s\S]*?`{3,}/gm

/** Mid-stream the closing backticks have not arrived yet, and half a JSON block is noise. */
const OPEN_INSIGHT_FENCE = /^[ \t]*`{3,}insight\b[\s\S]*$/m

/** The prose half of a message: insight fences are drawn as components, not as text. */
export function toProse(markdown: string): string {
  return stripWholeMessageFence(markdown)
    .replace(INSIGHT_FENCE, '')
    .replace(OPEN_INSIGHT_FENCE, '')
    .trim()
}
