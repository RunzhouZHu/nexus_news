export default function TrendingBadge({ score, size = 'md' }) {
  if (!score || score <= 0) return null

  const sizeClass = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  }[size] ?? 'text-sm px-3 py-1'

  return (
    <span className={`${sizeClass} bg-red-100 text-red-700 rounded-full font-semibold animate-pulse`}>
      🔥 {score.toFixed(1)}
    </span>
  )
}
