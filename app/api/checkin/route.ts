import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'
const TOKEN_TTL = 6 * 60 * 60 * 1000
const tokenCache: Record<string, { token: string; expiry: number }> = {}

async function getStaffToken(siteId: string): Promise<string> {
  const cached = tokenCache[siteId]
  if (cached && Date.now() < cached.expiry) return cached.token
  const res = await fetch(`${MBO_BASE}/usertoken/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': process.env.MBO_API_KEY!, 'SiteId': siteId },
    body: JSON.stringify({ Username: process.env.MBO_USERNAME!, Password: process.env.MBO_PASSWORD! }),
  })
  if (!res.ok) throw new Error('MBO auth failed')
  const data = await res.json()
  tokenCache[siteId] = { token: data.AccessToken, expiry: Date.now() + TOKEN_TTL }
  return data.AccessToken
}

export async function POST(req: NextRequest) {
  const { visitId, clientId, siteId, signedIn, classId, classDate } = await req.json()

  if (!visitId || !clientId || !siteId) {
    return NextResponse.json({ error: 'Missing visitId, clientId, or siteId' }, { status: 400 })
  }

  try {
    const token = await getStaffToken(siteId)

    // Call MBO updateclientvisit to toggle SignedIn
    const mboRes = await fetch(`${MBO_BASE}/client/updateclientvisit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.MBO_API_KEY!,
        'SiteId': siteId,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        VisitId: visitId,
        SignedIn: signedIn ?? true,
      }),
    })

    if (!mboRes.ok) {
      const err = await mboRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err?.Error?.Message ?? `MBO returned ${mboRes.status}` },
        { status: 502 }
      )
    }

    // Also update Supabase attendance (best-effort)
    if (classId && classDate) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const attendance = signedIn ? 'attended' : null
        await supabase
          .from('privilee_bookings')
          .update({ attendance })
          .eq('client_id', clientId)
          .eq('class_id', classId)
          .eq('class_date', classDate)
          .eq('type', 'booking')
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ success: true, signedIn })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('auth')) {
      Object.keys(tokenCache).forEach(k => delete tokenCache[k])
    }
    const message = err instanceof Error ? err.message : 'Check-in failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
