import 'dotenv/config'
import { getPublishedNodes } from './src/db/nodes.js'
const nodes = await getPublishedNodes({ limit: 5 })
console.log('Nodes:', nodes.map(n => n.title))
process.exit(0)
