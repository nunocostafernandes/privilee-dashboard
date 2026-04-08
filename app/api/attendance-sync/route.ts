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

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Accept optional date param, default to yesterday (Dubai time UTC+4)
  const dateParam = new URL(req.url).searchParams.get('date')
  let yesterday: string
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    yesterday = dateParam
  } else {
    const now = new Date()
    const dubai = new Date(now.getTime() + 4 * 60 * 60 * 1000)
    dubai.setDate(dubai.getDate() - 1)
    yesterday = dubai.toISOString().slice(0, 10)
  }

  // Fetch all Privilee bookings from yesterday that haven't been synced yet
  const { data: bookings } = await supabase
    .from('privilee_bookings')
    .select('id, class_id, client_id, studio_site_id, class_date')
    .eq('type', 'booking')
    .eq('class_date', yesterday)
    .is('attendance', null)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ synced: 0, date: yesterday, message: 'No bookings to sync' })
  }

  // Group bookings by class_id + studio to batch MBO calls
  const classGroups: Record<string, { siteId: string; bookings: PrivileeBooking[] }> = {}
  for (const b of bookings) {
    const key = `${b.class_id}-${b.studio_site_id}`
    if (!classGroups[key]) classGroups[key] = { siteId: b.studio_site_id, bookings: [] }
    classGroups[key].bookings.push(b)
  }

  let synced = 0
  const errors: string[] = []

  for (const [key, group] of Object.entries(classGroups)) {
    const classId = key.split('-')[0]
    try {
      // Fetch class visits from MBO (API key only, no staff token needed for past classes)
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

      // Build a map of clientId -> { signedIn, status }
      const visitMap: Record<string, { signedIn: boolean; status: string }> = {}
      for (const v of visits) {
        if (v.ClientId) {
          visitMap[v.ClientId] = {
            signedIn: v.SignedIn === true,
            status: v.AppointmentStatus ?? 'Unknown',
          }
        }
      }

      // Update each booking's attendance
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

  return NextResponse.json({
    synced,
    total: bookings.length,
    date: yesterday,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// Also support GET for easy testing
export async function GET(req: Request) {
  return POST(req)
}
