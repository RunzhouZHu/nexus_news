// src/pipeline/stages/notify.js
import { getUsersFollowingAnyTag, createNotification } from '../../db/users.js'

export async function runNotify(node) {
  if (!node.tags || node.tags.length === 0) return 0
  const userIds = await getUsersFollowingAnyTag(node.tags)
  for (const userId of userIds) {
    await createNotification({ userId, nodeId: node.id, triggerTag: node.tags[0] })
  }
  return userIds.length
}
