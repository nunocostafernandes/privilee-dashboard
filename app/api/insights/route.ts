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
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('privilee_bookings')
    .select('id, type, studio_name, class_name, class_date, class_time, client_name, client_email')

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

  // Time distribution
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

  return NextResponse.json({
    kpis: { totalBookings, uniqueClients, cancelRate, repeatRate },
    dailyTrend,
    studioSplit,
    timeDistribution,
    classRanking,
    cancellationBreakdown,
    repeatClients,
  })
}
