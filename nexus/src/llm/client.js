// src/llm/client.js
import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { buildExtractPrompt, buildDeduplicatePrompt, buildConnectPrompt } from './prompts.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function callClaude(prompt) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = msg.content[0].text.replace(/^```json\n?|```$/g, '').trim()
  return JSON.parse(text)
}

export async function extractEvent(article) {
  const prompt = buildExtractPrompt(article)
  return callClaude(prompt)
}

export async function deduplicateEvent(candidate, existingNodes) {
  if (existingNodes.length === 0) return { match: false, matchedId: null }
  const prompt = buildDeduplicatePrompt(candidate, existingNodes)
  return callClaude(prompt)
}

export async function findConnections(node, candidateNodes) {
  if (candidateNodes.length === 0) return []
  const prompt = buildConnectPrompt(node, candidateNodes)
  return callClaude(prompt)
}

export async function embedText(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}
