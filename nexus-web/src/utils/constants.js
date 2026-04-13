export const EDGE_TYPE_COLORS = {
  CAUSED_BY: '#ef4444',
  LED_TO: '#3b82f6',
  RELATED_TO: '#f59e0b',
  CONTEXT: '#6b7280',
}

export const TAG_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

export const getTagColor = (tag) => {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}
