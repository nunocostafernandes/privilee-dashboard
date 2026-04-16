import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'

interface PrivileeBooking {
  id: string
  class_id: number
  client_id: string
  studio_site_id: string
  class_date: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncDate(
  supabase: any,
  date: string,
  resync: boolean
): Promise<{ synced: number; total: number; date: string; errors?: string[] }> {
  // Fetch bookings for this date (unsynced only, unless resync=true)
  let query = supabase
    .from('privilee_bookings')
    .select('id, class_id, client_id, studio_site_id, class_date')
    .eq('type', 'booking')
    .eq('class_date', date)

  if (!resync) {
    query = query.is('attendance', null)
  }

  const { data: bookings } = await query

  if (!bookings || bookings.length === 0) {
    return { synced: 0, total: 0, date, errors: undefined }
  }

  // Group bookings by class_id + studio to batch MBO calls
  const classGroups: Record<string, { siteId: string; bookings: PrivileeBooking[] }> = {}
  for (const b of (bookings as PrivileeBooking[])) {
    const key = `${b.class_id}-${b.studio_site_id}`
    if (!classGroups[key]) classGroups[key] = { siteId: b.studio_site_id, bookings: [] }
    classGroups[key].bookings.push(b)
  }

  let synced = 0
  const errors: string[] = []

  for (const [key, group] of Object.entries(classGroups)) {
    const classId = key.split('-')[0]
    try {
      const res = await fetch(
        `${MBO_BASE}/class/classvisits?ClassID=${classId}`,
        {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': process.env.MBO_API_KEY!,
            'SiteId': group.siteId,
          },
        }
      )

      if (!res.ok) {
        errors.push(`MBO error for class ${classId}: ${res.status}`)
        continue
      }

      const data = await res.json()
      const visits: { ClientId?: string; AppointmentStatus?: string; SignedIn?: boolean }[] = data.Class?.Visits ?? []

      const visitMap: Record<string, { signedIn: boolean; status: string }> = {}
      for (const v of visits) {
        if (v.ClientId) {
          visitMap[v.ClientId] = {
            signedIn: v.SignedIn === true,
            status: v.AppointmentStatus ?? 'Unknown',
          }
        }
      }

      for (const b of group.bookings) {
        const visit = visitMap[b.client_id]
        let attendance: string

        if (!visit) {
          attendance = 'no_show'
        } else if (visit.signedIn) {
          attendance = 'attended'
        } else if (visit.status === 'LateCanceled') {
          attendance = 'late_cancel'
        } else {
          attendance = 'no_show'
        }

        const { error } = await supabase
          .from('privilee_bookings')
          .update({ attendance })
          .eq('id', b.id)

        if (!error) synced++
        else errors.push(`DB error for ${b.id}: ${error.message}`)
      }
    } catch (err) {
      errors.push(`Exception for class ${classId}: ${String(err)}`)
    }
  }

  return { synced, total: bookings.length, date, errors: errors.length > 0 ? errors : undefined }
}

function dubaiDate(offsetDays: number): string {
  const now = new Date()
  const dubai = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  dubai.setDate(dubai.getDate() + offsetDays)
  return dubai.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const url = new URL(req.url)
  const mode = url.searchParams.get('mode') // 'hourly' | 'nightly' | null
  const dateParam = url.searchParams.get('date')
  const resync = url.searchParams.get('resync') === 'true'

  let dates: string[]

  if (mode === 'hourly') {
    // Sync today's bookings (catch check-ins as they happen)
    dates = [dubaiDate(0)]
  } else if (mode === 'nightly') {
    // Sync yesterday + 5 days ago (catch late updates), force resync
    dates = [dubaiDate(-1), dubaiDate(-5)]
    // Nightly always resyncs (re-check even previously synced bookings)
    const results = await Promise.all(dates.map(d => syncDate(supabase, d, true)))
    return NextResponse.json({ mode: 'nightly', results })
  } else if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    dates = [dateParam]
  } else {
    dates = [dubaiDate(-1)]
  }

  const results = await Promise.all(dates.map(d => syncDate(supabase, d, resync)))

  if (results.length === 1) {
    return NextResponse.json(results[0])
  }
  return NextResponse.json({ results })
}

// Also support GET for easy testing
export async function GET(req: Request) {
  return POST(req)
}
