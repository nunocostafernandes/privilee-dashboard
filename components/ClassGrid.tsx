import ClassCard from './ClassCard'

interface ClassItem {
  classId: number; className: string; startTime: string; endTime: string
  totalBooked: number; maxCapacity: number; waitlistCount: number
}

interface Props {
  classes: ClassItem[] | null
  error: boolean
  siteId: string
  refreshKey: number
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--card)] rounded-xl px-4 py-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-20 rounded bg-[var(--skeleton)]" />
        <div className="h-4 flex-1 rounded bg-[var(--skeleton)]" />
        <div className="h-5 w-12 rounded-full bg-[var(--skeleton)]" />
      </div>
    </div>
  )
}

export default function ClassGrid({ classes, error, siteId, refreshKey }: Props) {
  if (error) {
    return (
      <p className="text-[var(--text-muted)] py-8 text-center">
        Could not load classes. Try refreshing.
      </p>
    )
  }

  if (classes === null) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <p className="text-[var(--text-muted)] py-8 text-center">
        No classes scheduled for this day.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {classes.map(cls => (
        <ClassCard key={cls.classId} cls={cls} siteId={siteId} refreshKey={refreshKey} />
      ))}
    </div>
  )
}
