import type { ReactNode } from 'react'

/** The one frame every data block sits in, so a chat answer reads as one surface. */
export function BlockCard({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface-raised p-3">
      <p className="text-sm text-ink-muted">{caption}</p>
      {children}
    </div>
  )
}
