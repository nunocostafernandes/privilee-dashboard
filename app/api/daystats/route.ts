import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mboFetch, mapClass } from '@/lib/mbo-client'

export async function GET(req: NextRequest) {
  const siteId    = req.nextUrl.searchParams.get('siteId')
  const startDate = req.nextUrl.searchParams.get('startDate')

  if (!siteId || !startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Build 6-day date range
  const base = new Date(startDate + 'T00:00:00')
  const dates: string[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
  const endDate = dates[5]

  // MBO: fetch all classes for the 6-day window, sum TotalBooked per day
  const mboTotal: Record<string, number> = {}
  try {
    const res = await mboFetch('/class/classes', siteId, {
      StartDateTime: `${startDate}T00:00:00`,
      EndDateTime:   `${endDate}T23:59:59`,
    })
    if (res.ok) {
      const data = await res.json()
      for (const raw of data.Classes ?? []) {
        const cls = mapClass(raw)
        const day = cls.startTime.slice(0, 10)
        mboTotal[day] = (mboTotal[day] ?? 0) + cls.totalBooked
      }
    }
  } catch { /* non-fatal */ }

  // Supabase: count Privilee bookings (type='booking') by class_date for this studio
  const privCount: Record<string, number> = {}
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('privilee_bookings')
      .select('class_date')
      .eq('studio_site_id', siteId)
      .eq('type', 'booking')
      .gte('class_date', startDate)
      .lte('class_date', endDate)

    for (const row of data ?? []) {
      privCount[row.class_date] = (privCount[row.class_date] ?? 0) + 1
    }
  } catch { /* non-fatal */ }

  const result: Record<string, { total: number; privilee: number }> = {}
  for (const d of dates) {
    result[d] = { total: mboTotal[d] ?? 0, privilee: privCount[d] ?? 0 }
  }

  return NextResponse.json(result)
}
