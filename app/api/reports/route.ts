import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface BookingRow {
  id: number
  type: string
  studio_name: string
  studio_site_id: string
  class_id: string
  class_name: string
  class_date: string
  class_time: string
  client_name: string
  client_email: string
  client_mobile: string
  mbo_booking_id: string
  notes: string
  created_at: string
  attendance: string | null
}

function getEmirate(studioName: string): string {
  const lower = studioName.toLowerCase()
  if (lower.includes('alserkal') || lower.includes('town square')) return 'Dubai'
  if (lower.includes('abu dhabi')) return 'Abu Dhabi'
  return 'Dubai'
}

function getISOWeek(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00Z')
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getISOWeekYear(dateStr: string): number {
  const date = new Date(dateStr + 'T00:00:00Z')
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  return d.getUTCFullYear()
}

function getWeekBounds(dateStr: string): { start: string; end: string } {
  const date = new Date(dateStr + 'T00:00:00Z')
  const dayOfWeek = date.getUTCDay() || 7
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - dayOfWeek + 1)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = url.searchParams.get('month') || defaultMonth

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch bookings for the selected month
  const startDate = `${month}-01`
  const [yearStr, monthStr] = month.split('-')
  const nextMonth = new Date(Number(yearStr), Number(monthStr), 1)
  const endDate = nextMonth.toISOString().slice(0, 10)

  // Fetch ALL bookings for the month (paginate past Supabase 1000-row limit)
  const monthData: BookingRow[] = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data: page, error: pageError } = await supabase
      .from('privilee_bookings')
      .select('*')
      .gte('class_date', startDate)
      .lt('class_date', endDate)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 })
    if (!page || page.length === 0) break
    monthData.push(...page)
    if (page.length < PAGE) break
    from += PAGE
  }

  // Fetch all distinct months for the selector
  const { data: allData, error: allError } = await supabase
    .from('privilee_bookings')
    .select('class_date')
    .limit(5000)

  if (allError) {
    return NextResponse.json({ error: allError.message }, { status: 500 })
  }

  const availableMonths = Array.from(
    new Set((allData ?? []).map((r: { class_date: string }) => r.class_date.slice(0, 7)))
  ).sort().reverse()

  const rows = (monthData ?? []) as BookingRow[]

  // Classify each booking as complimentary or top_up
  // Group by client_email + ISO week + emirate
  type GroupKey = string
  const groups: Record<GroupKey, BookingRow[]> = {}

  for (const row of rows) {
    const email = row.client_email.toLowerCase()
    const weekYear = getISOWeekYear(row.class_date)
    const week = getISOWeek(row.class_date)
    const emirate = getEmirate(row.studio_name)
    const key = `${email}|${weekYear}-W${week}|${emirate}`
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
  }

  // For each group, sort by created_at, walk through:
  // first non-early_cancel = complimentary, rest = top_up
  const classifications: Record<number, 'complimentary' | 'top_up'> = {}

  for (const key of Object.keys(groups)) {
    const groupRows = groups[key].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    let complimentaryAssigned = false
    for (const row of groupRows) {
      if (row.type === 'early_cancel') {
        // Early cancels don't consume the slot and aren't classified as comp or top-up
        // but we still tag them for display
        classifications[row.id] = complimentaryAssigned ? 'top_up' : 'complimentary'
        continue
      }
      if (!complimentaryAssigned) {
        classifications[row.id] = 'complimentary'
        complimentaryAssigned = true
      } else {
        classifications[row.id] = 'top_up'
      }
    }
  }

  // Summary
  const totalBookings = rows.length
  const attended = rows.filter(r => r.attendance === 'attended').length
  const noShows = rows.filter(r => r.attendance === 'no_show').length
  const lateCancels = rows.filter(r => r.type === 'late_cancel').length
  const earlyCancels = rows.filter(r => r.type === 'early_cancel').length
  const complimentary = rows.filter(r => classifications[r.id] === 'complimentary').length
  const topUps = rows.filter(r => classifications[r.id] === 'top_up').length

  const summary = { totalBookings, attended, noShows, lateCancels, earlyCancels, complimentary, topUps }

  // Billable: no-shows and late cancels from complimentary bookings only
  const billableNoShows = rows.filter(
    r => r.attendance === 'no_show' && classifications[r.id] === 'complimentary'
  ).length
  const billableLateCancels = rows.filter(
    r => r.type === 'late_cancel' && classifications[r.id] === 'complimentary'
  ).length
  const billable = {
    noShows: billableNoShows,
    lateCancels: billableLateCancels,
    total: billableNoShows + billableLateCancels,
  }

  // Weekly breakdown
  const weekMap: Record<string, {
    week: number; weekStart: string; weekEnd: string
    complimentary: number; topUps: number; attended: number; noShows: number; lateCancels: number
  }> = {}

  for (const row of rows) {
    const week = getISOWeek(row.class_date)
    const weekYear = getISOWeekYear(row.class_date)
    const wKey = `${weekYear}-W${week}`
    if (!weekMap[wKey]) {
      const bounds = getWeekBounds(row.class_date)
      weekMap[wKey] = {
        week, weekStart: bounds.start, weekEnd: bounds.end,
        complimentary: 0, topUps: 0, attended: 0, noShows: 0, lateCancels: 0,
      }
    }
    const w = weekMap[wKey]
    if (classifications[row.id] === 'complimentary') w.complimentary++
    else w.topUps++
    if (row.attendance === 'attended') w.attended++
    if (row.attendance === 'no_show') w.noShows++
    if (row.type === 'late_cancel') w.lateCancels++
  }

  const weeklyBreakdown = Object.values(weekMap).sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  // Client details
  const clientDetails = rows.map(row => ({
    clientName: row.client_name,
    clientEmail: row.client_email,
    emirate: getEmirate(row.studio_name),
    week: getISOWeek(row.class_date),
    classification: classifications[row.id],
    type: row.type,
    attendance: row.attendance,
    className: row.class_name,
    classDate: row.class_date,
    classTime: row.class_time,
    studioName: row.studio_name,
  })).sort((a, b) => a.classDate.localeCompare(b.classDate) || a.classTime.localeCompare(b.classTime))

  return NextResponse.json({
    month,
    summary,
    billable,
    weeklyBreakdown,
    clientDetails,
    availableMonths,
  })
}
