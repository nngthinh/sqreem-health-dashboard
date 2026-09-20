import { describe, expect, it } from 'vitest'
import { stripWholeMessageFence, toProse } from '../markdown'

describe('stripWholeMessageFence', () => {
  it('strips a fence that wraps the entire message', () => {
    expect(stripWholeMessageFence('```markdown\n# Hello\n\nBody text.\n```')).toBe(
      '# Hello\n\nBody text.',
    )
  })

  it('strips an unlabelled whole-message fence too', () => {
    expect(stripWholeMessageFence('```\nplain\n```')).toBe('plain')
  })

  it('leaves a fence that is only part of the message alone', () => {
    const markdown = 'Here is code:\n```js\nconst a = 1\n```\nand more prose.'
    expect(stripWholeMessageFence(markdown)).toBe(markdown)
  })

  it('leaves two separate fences alone', () => {
    const markdown = '```js\na\n```\ntext\n```js\nb\n```'
    expect(stripWholeMessageFence(markdown)).toBe(markdown)
  })

  it('leaves an insight fence alone, so blocks survive the pipeline', () => {
    const markdown = '```insight\n{ "kind": "goal", "goalId": "sleep" }\n```'
    expect(stripWholeMessageFence(markdown)).toBe(markdown)
  })

  it('leaves an unterminated fence alone, which is every mid-stream message', () => {
    expect(stripWholeMessageFence('```markdown\n# Half a rep')).toBe('```markdown\n# Half a rep')
  })
})

describe('toProse', () => {
  it('removes a closed insight fence and keeps the prose around it', () => {
    const markdown =
      'Your sleep is short.\n\n```insight\n{ "kind": "goal", "goalId": "sleep" }\n```\n\nTry an earlier night.'
    expect(toProse(markdown)).toBe('Your sleep is short.\n\n\n\nTry an earlier night.')
  })

  it('removes a fence still being streamed, so half a block never renders as code', () => {
    expect(toProse('Your sleep is short.\n\n```insight\n{ "kind": "go')).toBe(
      'Your sleep is short.',
    )
  })

  it('leaves an ordinary code fence alone', () => {
    const markdown = 'Example:\n```js\nconst a = 1\n```'
    expect(toProse(markdown)).toBe(markdown)
  })

  it('unwraps a whole-message fence on its way through', () => {
    expect(toProse('```markdown\n# Hello\n```')).toBe('# Hello')
  })
})
