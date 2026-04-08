import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface Booking {
  id: number
  type: string
  studio_name: string
  class_name: string
  class_date: string
  class_time: string
  client_name: string
  client_email: string
  created_at: string
}

export async function GET(req: Request) {
  const studio = new URL(req.url).searchParams.get('studio')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('privilee_bookings')
    .select('id, type, studio_name, class_name, class_date, class_time, client_name, client_email, created_at')

  if (studio && studio !== 'All') {
    query = query.eq('studio_name', studio)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as Booking[]

  // KPIs
  const bookings = rows.filter(r => r.type === 'booking')
  const totalBookings = bookings.length
  const uniqueClients = new Set(bookings.map(b => b.client_email.toLowerCase())).size
  const cancellations = rows.filter(r => r.type === 'early_cancel' || r.type === 'late_cancel')
  const cancelRate = rows.length > 0 ? Math.round((cancellations.length / rows.length) * 1000) / 10 : 0

  // Repeat visitors
  const clientBookingCounts: Record<string, { name: string; count: number; lastDate: string }> = {}
  for (const b of bookings) {
    const key = b.client_email.toLowerCase()
    if (!clientBookingCounts[key]) {
      clientBookingCounts[key] = { name: b.client_name, count: 0, lastDate: b.class_date }
    }
    clientBookingCounts[key].count++
    if (b.class_date > clientBookingCounts[key].lastDate) {
      clientBookingCounts[key].lastDate = b.class_date
    }
  }
  const repeatClients = Object.values(clientBookingCounts)
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count)
  const repeatRate = uniqueClients > 0 ? Math.round((repeatClients.length / uniqueClients) * 1000) / 10 : 0

  // Daily trend (last 30 dates)
  const dailyMap: Record<string, { bookings: number; cancellations: number }> = {}
  for (const r of rows) {
    if (!dailyMap[r.class_date]) dailyMap[r.class_date] = { bookings: 0, cancellations: 0 }
    if (r.type === 'booking') dailyMap[r.class_date].bookings++
    else dailyMap[r.class_date].cancellations++
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, counts]) => ({ date, ...counts }))

  // Studio split
  const studioMap: Record<string, number> = {}
  for (const b of bookings) {
    studioMap[b.studio_name] = (studioMap[b.studio_name] ?? 0) + 1
  }
  const studioSplit = Object.entries(studioMap)
    .map(([studio, count]) => ({ studio, count }))
    .sort((a, b) => b.count - a.count)

  // Time distribution (class times)
  const timeMap: Record<string, number> = {}
  for (const b of bookings) {
    timeMap[b.class_time] = (timeMap[b.class_time] ?? 0) + 1
  }
  const timeDistribution = Object.entries(timeMap)
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Class ranking
  const classMap: Record<string, { bookings: number; cancellations: number }> = {}
  for (const r of rows) {
    if (!classMap[r.class_name]) classMap[r.class_name] = { bookings: 0, cancellations: 0 }
    if (r.type === 'booking') classMap[r.class_name].bookings++
    else classMap[r.class_name].cancellations++
  }
  const classRanking = Object.entries(classMap)
    .map(([className, counts]) => {
      const total = counts.bookings + counts.cancellations
      return {
        className,
        bookings: counts.bookings,
        cancellations: counts.cancellations,
        cancelRate: total > 0 ? Math.round((counts.cancellations / total) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.bookings - a.bookings)

  // Cancellation breakdown
  const earlyCount = rows.filter(r => r.type === 'early_cancel').length
  const lateCount = rows.filter(r => r.type === 'late_cancel').length
  const totalCancels = earlyCount + lateCount
  const cancellationBreakdown = {
    early: earlyCount,
    late: lateCount,
    earlyPct: totalCancels > 0 ? Math.round((earlyCount / totalCancels) * 1000) / 10 : 0,
    latePct: totalCancels > 0 ? Math.round((lateCount / totalCancels) * 1000) / 10 : 0,
  }

  // Booking lead time (days between created_at and class_date)
  const leadBuckets: Record<string, number> = {
    'Same day': 0,
    '1 day ahead': 0,
    '2-3 days ahead': 0,
    '4+ days ahead': 0,
  }
  for (const b of bookings) {
    const created = new Date(b.created_at)
    const classDay = new Date(b.class_date + 'T00:00:00Z')
    const createdDay = new Date(created.toISOString().slice(0, 10) + 'T00:00:00Z')
    const diff = Math.round((classDay.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) leadBuckets['Same day']++
    else if (diff === 1) leadBuckets['1 day ahead']++
    else if (diff <= 3) leadBuckets['2-3 days ahead']++
    else leadBuckets['4+ days ahead']++
  }
  const leadTime = Object.entries(leadBuckets).map(([label, count]) => ({
    label,
    count,
    pct: totalBookings > 0 ? Math.round((count / totalBookings) * 1000) / 10 : 0,
  }))

  // Booking activity by hour (Dubai time UTC+4)
  const hourMap: Record<number, number> = {}
  for (const b of bookings) {
    const utcHour = new Date(b.created_at).getUTCHours()
    const dubaiHour = (utcHour + 4) % 24
    hourMap[dubaiHour] = (hourMap[dubaiHour] ?? 0) + 1
  }
  const bookingActivity = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h === 0 ? '12' : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`,
    count: hourMap[h] ?? 0,
  })).filter(h => h.count > 0)

  // Available studios (always unfiltered)
  let allStudios: string[] = []
  if (studio && studio !== 'All') {
    const { data: studioData } = await supabase.from('privilee_bookings').select('studio_name')
    allStudios = Array.from(new Set((studioData ?? []).map((r: { studio_name: string }) => r.studio_name))).sort()
  } else {
    allStudios = Array.from(new Set(rows.map(r => r.studio_name))).sort()
  }

  return NextResponse.json({
    kpis: { totalBookings, uniqueClients, cancelRate, repeatRate },
    dailyTrend,
    studioSplit,
    classRanking,
    timeDistribution,
    bookingActivity,
    leadTime,
    cancellationBreakdown,
    repeatClients,
    studios: allStudios,
  })
}
