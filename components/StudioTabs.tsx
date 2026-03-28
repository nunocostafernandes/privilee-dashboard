'use client'
import { STUDIOS, type Studio } from '@/lib/studios'

interface Props {
  active: Studio
  onChange: (studio: Studio) => void
}

export default function StudioTabs({ active, onChange }: Props) {
  return (
    <div
      className="p-1 rounded-xl flex gap-1"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {STUDIOS.map((studio) => {
        const isActive = studio.siteId === active.siteId
        return (
          <button
            key={studio.siteId}
            onClick={() => onChange(studio)}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            style={{
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-muted)',
              boxShadow: isActive ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
            }}
          >
            {studio.name}
          </button>
        )
      })}
    </div>
  )
}
