import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

  const result: Record<string, number> = {}
  for (const d of dates) {
    result[d] = privCount[d] ?? 0
  }

  return NextResponse.json(result)
}
