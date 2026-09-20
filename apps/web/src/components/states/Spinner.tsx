export function Spinner({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={className}>
      <span
        aria-hidden="true"
        className="block h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink motion-reduce:animate-none"
      />
    </span>
  )
}
