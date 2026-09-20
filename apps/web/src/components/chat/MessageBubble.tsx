import { extractInsightBlocks, type InsightBlock, MessageRole } from '@health/shared/schema'
import { toProse } from '../../lib/markdown'
import { InsightBlockRenderer } from './InsightBlockRenderer'
import { Markdown } from './Markdown'

type MessageBubbleProps = {
  role: MessageRole
  content: string
  /** Absent while streaming, when the only source is the text arriving so far. */
  blocks?: InsightBlock[]
}

function blockKey(block: InsightBlock, index: number): string {
  return `${index}-${JSON.stringify(block)}`
}

export function MessageBubble({ role, content, blocks }: MessageBubbleProps) {
  if (role === MessageRole.User) {
    return (
      // A block would fill the column whatever it holds, so the bubble is sized to its
      // own text and pushed right; long asks still stop at most of the width.
      <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-card bg-line px-3 py-2 text-sm">
        {content}
      </div>
    )
  }

  const prose = toProse(content)

  // A stored message keeps the blocks the server validated and froze to absolute
  // dates; a streaming one is parsed as it arrives, and half a fence matches nothing.
  const rendered = blocks ?? extractInsightBlocks(content).blocks

  return (
    <div className="max-w-[95%] space-y-3 text-sm">
      {prose.length > 0 && <Markdown prose={prose} />}

      {rendered.map((block, index) => (
        <InsightBlockRenderer key={blockKey(block, index)} block={block} />
      ))}
    </div>
  )
}
