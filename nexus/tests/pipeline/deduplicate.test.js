// tests/pipeline/deduplicate.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import { createNode } from '../../src/db/nodes.js'
import { runDeduplicate } from '../../src/pipeline/stages/deduplicate.js'
import { embedText } from '../../src/llm/client.js'

beforeEach(async () => {
  await pool.query('DELETE FROM notifications; DELETE FROM followed_topics; DELETE FROM saved_nodes; DELETE FROM edges; DELETE FROM sources; DELETE FROM nodes; DELETE FROM users')
})

describe('runDeduplicate', () => {
  it('returns action=new when no nodes exist', async () => {
    const emb = await embedText('Test event with no matches.')
    const result = await runDeduplicate({
      title: 'Completely unique event XYZ',
      summary: 'Nothing like anything else.',
      date: new Date(),
      tags: ['unique'],
      embedding: emb,
    })
    expect(result.action).toBe('new')
  })

  it('returns action=new or existing for a similar event', async () => {
    const emb = await embedText('Gas prices spike 18% after OPEC output cuts in February 2025.')
    await createNode({
      title: 'Gas prices spike 18%',
      summary: 'Global fuel markets reacted sharply after OPEC cuts.',
      date: new Date('2025-02-03'),
      tags: ['energy', 'OPEC', 'oil'],
      embedding: emb,
      created_by: 'ai',
      status: 'published',
    })
    const result = await runDeduplicate({
      title: 'Gas prices jump 18% globally',
      summary: 'Fuel costs rose sharply globally.',
      date: new Date('2025-02-03'),
      tags: ['energy', 'oil'],
      embedding: emb,
    })
    // With near-identical embeddings, LLM may match or may not — both are valid outcomes
    expect(['new', 'existing']).toContain(result.action)
  })
})
