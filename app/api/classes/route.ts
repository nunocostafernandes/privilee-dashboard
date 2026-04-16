import { NextRequest, NextResponse } from 'next/server'
import { mboFetch, mapClass } from '@/lib/mbo-client'

export const dynamic = 'force-dynamic'

async function fetchVisitCounts(classId: number, siteId: string): Promise<{ total: number; privilee: number }> {
  try {
    const res = await mboFetch('/class/classvisits', siteId, { ClassID: String(classId) })
    if (!res.ok) return { total: 0, privilee: 0 }
    const data = await res.json()
    const visits: { ServiceName?: string }[] = data.Class?.Visits ?? []
    const privilee = visits.filter(v => (v.ServiceName ?? '').toLowerCase().includes('privilee')).length
    return { total: visits.length, privilee }
  } catch {
    return { total: 0, privilee: 0 }
  }
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')
  const date   = req.nextUrl.searchParams.get('date')

  if (!siteId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing siteId or date' }, { status: 400 })
  }

  try {
    const res = await mboFetch('/class/classes', siteId, {
      StartDateTime: `${date}T00:00:00`,
      EndDateTime:   `${date}T23:59:59`,
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
    }

    const data = await res.json()
    const classes = (data.Classes ?? [])
      .map(mapClass)
      .sort((a: { startTime: string }, b: { startTime: string }) => a.startTime.localeCompare(b.startTime))

    // Fetch visit counts for all classes in parallel
    const counts = await Promise.all(
      classes.map((cls: { classId: number }) => fetchVisitCounts(cls.classId, siteId))
    )

    const classesWithCounts = classes.map((cls: ReturnType<typeof mapClass>, i: number) => ({
      ...cls,
      bookingCount: counts[i].total,
      privileeCount: counts[i].privilee,
    }))

    return NextResponse.json(classesWithCounts)
  } catch {
    return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
  }
}
