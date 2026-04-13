import { describe, it, expect } from 'vitest'
import { extractEvent } from '../../src/llm/client.js'

describe('extractEvent', () => {
  it('returns structured event from article text', async () => {
    const article = {
      title: 'Gas prices spike 18% after OPEC cuts',
      body: 'Global fuel markets reacted sharply on February 3rd after OPEC announced a 2 million barrel per day output cut. US average gas prices rose to $4.78.',
      outlet: 'BBC',
      url: 'https://bbc.com/gas-prices',
      published_at: new Date('2025-02-03'),
    }
    const result = await extractEvent(article)
    expect(result.title).toBeDefined()
    expect(result.summary).toBeDefined()
    expect(Array.isArray(result.tags)).toBe(true)
    expect(result.date).toBeDefined()
  })
})
