import { describe, it, expect, beforeEach } from 'vitest'
import { pool } from '../../src/db/client.js'
import { createNode } from '../../src/db/nodes.js'
import { runConnect } from '../../src/pipeline/stages/connect.js'
import { embedText } from '../../src/llm/client.js'

beforeEach(async () => {
  await pool.query(
    'DELETE FROM notifications; DELETE FROM followed_topics; DELETE FROM saved_nodes; DELETE FROM edges; DELETE FROM sources; DELETE FROM nodes; DELETE FROM users'
  )
})

describe('runConnect', () => {
  it('returns [] when no other published nodes exist', async () => {
    const emb = await embedText('Interest rates rise as Fed tightens policy.')
    const node = await createNode({
      title: 'Fed raises rates by 0.5%',
      summary: 'The Federal Reserve increased interest rates.',
      date: new Date('2025-03-01'),
      tags: ['economy', 'fed', 'rates'],
      embedding: emb,
      created_by: 'ai',
      status: 'published',
    })
    const result = await runConnect(node)
    expect(result).toEqual([])
  })

  it('creates edges or returns [] between two thematically related published nodes', async () => {
    const emb1 = await embedText('Interest rates rise as Fed tightens monetary policy.')
    const emb2 = await embedText('Inflation slows after Fed raises interest rates.')
    const node1 = await createNode({
      title: 'Fed raises rates by 0.5%',
      summary: 'The Federal Reserve increased interest rates to combat inflation.',
      date: new Date('2025-03-01'),
      tags: ['economy', 'fed', 'rates', 'inflation'],
      embedding: emb1,
      created_by: 'ai',
      status: 'published',
    })
    await createNode({
      title: 'Inflation drops to 3.2% following rate hikes',
      summary: 'Consumer prices fell after the Fed rate increases.',
      date: new Date('2025-04-01'),
      tags: ['economy', 'inflation', 'rates'],
      embedding: emb2,
      created_by: 'ai',
      status: 'published',
    })
    const result = await runConnect(node1)
    expect(Array.isArray(result)).toBe(true)
    for (const edge of result) {
      expect(edge.from_node).toBe(node1.id)
      expect(['CAUSED_BY', 'LED_TO', 'RELATED_TO', 'CONTEXT']).toContain(edge.type)
      expect(edge.confidence).toBeGreaterThanOrEqual(0.5)
    }
  })
})
