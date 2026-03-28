import ClassCard from './ClassCard'

interface ClassItem {
  classId: number; className: string; startTime: string; endTime: string
  totalBooked: number; maxCapacity: number; waitlistCount: number; bookingCount: number
}

interface Props {
  classes: ClassItem[] | null
  error: boolean
  siteId: string
  studioName: string
  refreshKey: number
  privOnly: boolean
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-xl px-4 py-3.5 animate-pulse"
      style={{ background: 'var(--card)', border: '1px solid var(--border)', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="h-3.5 w-16 rounded-md" style={{ background: 'var(--skeleton)' }} />
        <div className="h-3.5 flex-1 rounded-md" style={{ background: 'var(--skeleton)' }} />
        <div className="h-6 w-10 rounded-lg" style={{ background: 'var(--skeleton)' }} />
      </div>
    </div>
  )
}

export default function ClassGrid({ classes, error, siteId, studioName, refreshKey, privOnly }: Props) {
  if (error) {
    return (
      <div className="py-12 text-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Could not load classes. Try refreshing.
        </p>
      </div>
    )
  }

  if (classes === null) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} delay={i * 75} />)}
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No classes scheduled for this day.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {classes.map(cls => (
        <ClassCard key={cls.classId} cls={cls} siteId={siteId} studioName={studioName} refreshKey={refreshKey} privOnly={privOnly} />
      ))}
    </div>
  )
}
