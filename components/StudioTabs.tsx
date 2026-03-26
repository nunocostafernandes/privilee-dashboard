'use client'
import { STUDIOS, type Studio } from '@/lib/studios'

interface Props {
  active: Studio
  onChange: (studio: Studio) => void
}

export default function StudioTabs({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-[var(--border)]">
      {STUDIOS.map((studio) => {
        const isActive = studio.siteId === active.siteId
        return (
          <button
            key={studio.siteId}
            onClick={() => onChange(studio)}
            className={`px-6 py-3 text-sm font-semibold transition-colors ${
              isActive
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {studio.name}
          </button>
        )
      })}
    </div>
  )
}
