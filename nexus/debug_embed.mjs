import 'dotenv/config'
import { embedText } from './src/llm/client.js'
const result = await embedText('Oil prices rose after OPEC cuts.')
console.log('Type:', typeof result)
console.log('Is array:', Array.isArray(result))
console.log('Length:', result?.length)
console.log('First 3:', result?.slice(0, 3))
process.exit(0)
