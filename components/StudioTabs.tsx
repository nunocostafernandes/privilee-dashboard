'use client'
import { STUDIOS, type Studio } from '@/lib/studios'

interface Props {
  active: Studio
  onChange: (studio: Studio) => void
}

export default function StudioTabs({ active, onChange }: Props) {
  return (
    <div className="p-1 rounded-xl flex gap-1" style={{ backgroundColor: 'var(--card)' }}>
      {STUDIOS.map((studio) => {
        const isActive = studio.siteId === active.siteId
        return (
          <button
            key={studio.siteId}
            onClick={() => onChange(studio)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? 'bg-[var(--accent)] text-white shadow-sm'
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
