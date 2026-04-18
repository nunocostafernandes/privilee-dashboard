import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mboFetch } from '@/lib/mbo-client'

export const dynamic = 'force-dynamic'

const STUDIOS = [
  { siteId: '564676', name: 'Alserkal Avenue' },
  { siteId: '5741777', name: 'Town Square' },
  { siteId: '415190', name: 'Abu Dhabi' },
]

interface MboVisit {
  ClientId?: string
  AppointmentStatus?: string
  ServiceName?: string
  SignedIn?: boolean
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing or invalid date param (YYYY-MM-DD)' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all Supabase bookings for this date
  const { data: sbBookings } = await supabase
    .from('privilee_bookings')
    .select('client_id, client_email, type, attendance')
    .eq('class_date', date)
    .eq('type', 'booking')

  const sbClientIds = new Set((sbBookings ?? []).map(b => b.client_id))

  // Fetch all Privilee visits from MBO across all studios
  const missing: {
    clientId: string
    firstName: string
    lastName: string
    email: string
    className: string
    classTime: string
    studioName: string
    signedIn: boolean
    status: string
  }[] = []

  for (const studio of STUDIOS) {
    // Get classes for the date
    const classRes = await mboFetch('/class/classes', studio.siteId, {
      StartDateTime: date,
      EndDateTime: date,
    })
    if (!classRes.ok) continue
    const classData = await classRes.json()
    const classes: { Id: number; ClassDescription?: { Name?: string }; StartDateTime: string }[] = classData.Classes ?? []

    for (const cls of classes) {
      // Get visits for each class
      const visitRes = await mboFetch('/class/classvisits', studio.siteId, { ClassID: String(cls.Id) })
      if (!visitRes.ok) continue
      const visitData = await visitRes.json()
      const visits: MboVisit[] = visitData.Class?.Visits ?? []

      const privileeVisits = visits.filter(v =>
        v.ServiceName && v.ServiceName.toLowerCase().includes('privilee')
      )

      for (const v of privileeVisits) {
        if (v.ClientId && !sbClientIds.has(v.ClientId)) {
          // This client is in MBO but not in Supabase -- fetch their name
          missing.push({
            clientId: v.ClientId,
            firstName: '',
            lastName: '',
            email: '',
            className: cls.ClassDescription?.Name ?? '',
            classTime: new Date(cls.StartDateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            studioName: studio.name,
            signedIn: v.SignedIn === true,
            status: v.AppointmentStatus ?? 'Unknown',
          })
        }
      }
    }
  }

  // Batch fetch client details for missing clients
  if (missing.length > 0) {
    const clientMap: Record<string, { first: string; last: string; email: string }> = {}

    // Group by studio to use the right siteId for client lookup
    for (const studio of STUDIOS) {
      const studioMissing = missing.filter(m => m.studioName === studio.name)
      const ids = Array.from(new Set(studioMissing.map(m => m.clientId)))
      if (ids.length === 0) continue

      const CHUNK = 10
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK)
        const clientRes = await mboFetch('/client/clients', studio.siteId,
          Object.fromEntries(chunk.map((id, idx) => [`ClientIds[${idx}]`, id])),
          true
        )
        if (!clientRes.ok) continue
        const clientData = await clientRes.json()
        for (const c of (clientData.Clients ?? [])) {
          clientMap[c.Id] = {
            first: c.FirstName?.trim() ?? '',
            last: c.LastName?.trim() ?? '',
            email: c.Email?.trim() ?? '',
          }
        }
      }
    }

    for (const m of missing) {
      const info = clientMap[m.clientId]
      if (info) {
        m.firstName = info.first
        m.lastName = info.last
        m.email = info.email
      }
    }
  }

  return NextResponse.json({
    date,
    supabaseCount: sbBookings?.length ?? 0,
    mboMissing: missing,
    mboMissingCount: missing.length,
  })
}
