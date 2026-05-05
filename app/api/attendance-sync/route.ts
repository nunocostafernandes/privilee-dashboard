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
  studio_name: string
  class_name: string
  class_time: string
  client_name: string
  client_email: string
  client_mobile: string | null
}

async function syncDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  date: string,
  resync: boolean
): Promise<{ synced: number; total: number; date: string; errors?: string[] }> {
  // Fetch bookings for this date (unsynced only, unless resync=true)
  // Always skip bookings manually marked as late_cancel/early_cancel (correction from cancel API).
  // OR-with-IS-NULL is required: NULL NOT IN (...) evaluates to NULL in Postgres, which would silently
  // exclude the very unsynced rows we need to process.
  let query = supabase
    .from('privilee_bookings')
    .select('id, class_id, client_id, studio_site_id, class_date, studio_name, class_name, class_time, client_name, client_email, client_mobile')
    .eq('type', 'booking')
    .eq('class_date', date)
    .or('attendance.is.null,attendance.not.in.(late_cancel,early_cancel)')

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
          // Client not in MBO roster -- early cancel is the only action that removes from roster.
          // Check for existing cancel row first; if none, assume early cancel.
          const { data: cancelRow } = await supabase
            .from('privilee_bookings')
            .select('type')
            .eq('client_id', b.client_id)
            .eq('class_id', b.class_id)
            .eq('class_date', b.class_date)
            .in('type', ['early_cancel', 'late_cancel'])
            .limit(1)
            .maybeSingle()
          if (cancelRow) {
            attendance = cancelRow.type
          } else {
            attendance = 'early_cancel'
            // Insert the missing early_cancel row so reports are complete
            await supabase.from('privilee_bookings').insert({
              type: 'early_cancel',
              studio_site_id: b.studio_site_id,
              studio_name: b.studio_name,
              class_id: b.class_id,
              class_name: b.class_name,
              class_date: b.class_date,
              class_time: b.class_time,
              client_id: b.client_id,
              client_name: b.client_name,
              client_email: b.client_email,
              client_mobile: b.client_mobile,
            }).then(() => {}).catch(() => {}) // best-effort, unique index prevents duplicates
          }
        } else if (visit.signedIn) {
          attendance = 'attended'
        } else if (visit.status === 'LateCanceled' || visit.status === 'Cancelled') {
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
    // Sync today's bookings — always resync to catch check-ins after initial sync
    dates = [dubaiDate(0)]
    const results = await Promise.all(dates.map(d => syncDate(supabase, d, true)))
    return NextResponse.json({ mode: 'hourly', results: results.length === 1 ? results[0] : results })
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
