import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'

let cachedToken: string | null = null
let tokenExpiry = 0

async function getStaffToken(siteId: string): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${MBO_BASE}/usertoken/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.MBO_API_KEY!,
      'SiteId': siteId,
    },
    body: JSON.stringify({
      Username: process.env.MBO_USERNAME!,
      Password: process.env.MBO_PASSWORD!,
    }),
  })
  if (!res.ok) throw new Error('MBO staff authentication failed')
  const data = await res.json()
  cachedToken = data.AccessToken
  tokenExpiry = Date.now() + 6 * 60 * 60 * 1000
  return cachedToken!
}

function headers(token: string, siteId: string) {
  return {
    'Content-Type': 'application/json',
    'Api-Key': process.env.MBO_API_KEY!,
    'SiteId': siteId,
    'Authorization': `Bearer ${token}`,
  }
}

async function voidPrivileeCredit(token: string, siteId: string, clientId: string): Promise<void> {
  // Fetch client's active Privilee services
  const res = await fetch(
    `${MBO_BASE}/client/clientservices?clientId=${encodeURIComponent(clientId)}`,
    { headers: headers(token, siteId) }
  )
  if (!res.ok) return // best-effort

  const data = await res.json()
  const services: { Id: number; Name: string }[] = data.ClientServices ?? []
  const privileeServices = services.filter(s => s.Name.toLowerCase().includes('privilee'))

  // Set Count:0 — zeros out Remaining and marks Current:false (inactive)
  await Promise.all(privileeServices.map(svc =>
    fetch(`${MBO_BASE}/client/updateclientservice`, {
      method: 'POST',
      headers: headers(token, siteId),
      body: JSON.stringify({ ClientId: clientId, ServiceId: svc.Id, Count: 0 }),
    })
  ))
}

export async function POST(req: NextRequest) {
  const { classId, clientId, siteId, lateCancel, studioName, className, startTime, clientName } = await req.json()

  if (!classId || !clientId || !siteId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const token = await getStaffToken(siteId)

    // Cancel the booking
    const res = await fetch(`${MBO_BASE}/class/removeclientfromclass`, {
      method: 'POST',
      headers: headers(token, siteId),
      body: JSON.stringify({
        ClassId: classId,
        ClientId: clientId,
        LateCancel: lateCancel ?? false,
        SendEmail: false,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.Error?.Message ?? 'Failed to cancel booking')
    }

    // For early cancel only: void the restored Privilee credit
    if (!lateCancel) {
      await voidPrivileeCredit(token, siteId, clientId)
    }

    // Log cancellation to Supabase (best-effort)
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const d = startTime ? new Date(startTime) : new Date()
      const classDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const classTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      await supabase.from('privilee_bookings').insert({
        type:           lateCancel ? 'late_cancel' : 'early_cancel',
        studio_name:    studioName ?? '',
        studio_site_id: siteId,
        class_id:       classId,
        class_name:     className ?? '',
        class_date:     classDate,
        class_time:     classTime,
        client_id:      clientId,
        client_name:    clientName ?? '',
        client_email:   '',
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('authentication')) {
      cachedToken = null
      tokenExpiry = 0
    }
    const message = err instanceof Error ? err.message : 'Cancel failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
