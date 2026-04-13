import 'dotenv/config'
import { enqueueArticle } from './src/pipeline/queue.js'
await enqueueArticle({
  title: 'Oil prices surge after OPEC+ output cuts deepened',
  body: 'Global oil prices rose sharply after OPEC announced a major 2M barrel/day output reduction on February 3, 2025. US average prices hit 4.78 USD.',
  outlet: 'Test',
  url: 'https://example.com/oil-test-' + Date.now(),
  published_at: new Date('2025-02-03'),
  media_type: 'article',
})
console.log('Enqueued')
process.exit(0)
