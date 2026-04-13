// src/llm/prompts.js

export function buildExtractPrompt(article) {
  return `You are a news event extractor. Given this news article, extract the core event.

Article title: ${article.title}
Article body: ${article.body.slice(0, 3000)}
Published: ${article.published_at}
Outlet: ${article.outlet}

Respond with ONLY valid JSON matching this schema:
{
  "title": "one-sentence event description (max 100 chars)",
  "summary": "neutral 2-3 sentence summary of what happened",
  "date": "ISO 8601 date when the event occurred (not published)",
  "tags": ["array", "of", "relevant", "tags", "entities", "topics", "places", "orgs"]
}

Be precise. Tags should include: named entities (people, orgs, places), topics (energy, inflation), and domain keywords.`
}

export function buildDeduplicatePrompt(candidate, existingNodes) {
  const list = existingNodes.map((n, i) => `${i + 1}. [${n.id}] ${n.title} (${n.date?.toISOString?.()?.slice(0,10) ?? n.date})`).join('\n')
  return `You are a news event deduplication assistant.

Candidate event: "${candidate.title}"
Summary: ${candidate.summary}

Existing events that may be the same:
${list}

Is the candidate event the SAME real-world occurrence as any existing event?
Respond with ONLY valid JSON:
{ "match": true/false, "matchedId": "uuid or null", "reason": "brief explanation" }`
}

export function buildConnectPrompt(node, candidateNodes) {
  const list = candidateNodes.map((n, i) =>
    `${i + 1}. [${n.id}] ${n.title} | tags: ${n.tags?.join(', ')}`
  ).join('\n')

  return `You are a news event connection analyst. Given a focal event and a list of candidate events, identify meaningful connections.

Focal event: "${node.title}"
Summary: ${node.summary}
Tags: ${node.tags?.join(', ')}

Candidate events:
${list}

For each connection you find, output a JSON array:
[
  {
    "nodeId": "uuid of connected event",
    "type": "CAUSED_BY | LED_TO | RELATED_TO | CONTEXT",
    "confidence": 0.0-1.0,
    "reason": "brief explanation"
  }
]

Rules:
- CAUSED_BY: the candidate event directly caused the focal event
- LED_TO: the focal event directly caused or triggered the candidate event
- RELATED_TO: meaningfully connected but no direct causation
- CONTEXT: background context for understanding the focal event
- Only include connections with confidence >= 0.5
- Respond with ONLY the JSON array (empty array if no connections)`
}
