export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatNumber(num) {
  if (num == null) return '0'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

export function truncate(str, length = 50) {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}
