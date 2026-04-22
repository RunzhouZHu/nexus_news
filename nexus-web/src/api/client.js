import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
})

// Set by ClerkTokenProvider so the interceptor can call it outside React
let _getToken = null
export function setClerkGetToken(fn) { _getToken = fn }

client.interceptors.request.use(async (config) => {
  const token = _getToken ? await _getToken() : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default client
