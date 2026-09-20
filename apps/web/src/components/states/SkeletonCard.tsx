export function SkeletonCard({
  className = '',
  lines = 3,
}: {
  className?: string
  lines?: number
}) {
  return (
    <div
      className={`animate-pulse rounded-card border border-line bg-surface-raised p-4 ${className}`}
      aria-hidden="true"
    >
      <div className="mb-3 h-3 w-24 rounded bg-line" />
      {Array.from({ length: lines }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the placeholder bars are a fixed-length list with no identity
        <div key={i} className="mb-2 h-4 rounded bg-line" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  )
}
