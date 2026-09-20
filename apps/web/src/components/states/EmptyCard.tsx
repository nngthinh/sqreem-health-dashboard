export function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-[--radius-card] border border-dashed border-line bg-surface p-4">
      <p className="font-medium text-ink-muted">{title}</p>
      <p className="mt-1 text-sm text-ink-muted/80">{message}</p>
    </div>
  )
}
