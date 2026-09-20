import { Band, BlockKind, type InsightBlock, Tone } from '@health/shared/schema'
import { TONE_BORDER } from '../../lib/tone'
import { ComparisonBlock } from './blocks/ComparisonBlock'
import { GoalBlock } from './blocks/GoalBlock'
import { MetricBlock } from './blocks/MetricBlock'

/** A callout may warn; a goal may only be good, steady or watch. Risk lands on watch. */
const CALLOUT_BANDS: Record<Tone, Band> = {
  [Tone.Good]: Band.Good,
  [Tone.Watch]: Band.Watch,
  [Tone.Risk]: Band.Watch,
}

/**
 * The model names a block; every figure inside it is drawn here from the same data the
 * dashboard renders. A number it invented has nowhere to appear.
 */
export function InsightBlockRenderer({ block }: { block: InsightBlock }) {
  if (block.kind === BlockKind.Callout) {
    return (
      // The text is a child node, never markup: injected HTML arrives escaped.
      <div className={`rounded-card border p-3 text-sm ${TONE_BORDER[CALLOUT_BANDS[block.tone]]}`}>
        {block.text}
      </div>
    )
  }

  if (block.kind === BlockKind.Actions) {
    return (
      <ul className="list-disc space-y-1 rounded-card border border-line p-3 pl-7 text-sm">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }

  if (block.kind === BlockKind.Goal) return <GoalBlock block={block} />

  if (block.kind === BlockKind.Comparison) return <ComparisonBlock block={block} />

  return <MetricBlock block={block} />
}
