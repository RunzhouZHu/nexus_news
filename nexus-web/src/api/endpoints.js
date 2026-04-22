export const API_ENDPOINTS = {
  NODES: '/api/nodes',
  NODE: (id) => `/api/nodes/${id}`,
  SEARCH: '/api/search',
  CONNECTIONS: (id) => `/api/nodes/${id}/connections`,
  EDGES: '/api/edges',
  AUTH_SYNC: '/api/auth/sync',
  USER_SAVED: '/api/user/saved',
  USER_SAVED_NODE: (id) => `/api/user/saved/${id}`,
  USER_TOPICS: '/api/user/topics',
}
