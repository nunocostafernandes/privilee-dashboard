import { NextRequest, NextResponse } from 'next/server'

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
  // Fetch client's active services
  const res = await fetch(
    `${MBO_BASE}/client/clientservices?clientId=${encodeURIComponent(clientId)}`,
    { headers: headers(token, siteId) }
  )
  if (!res.ok) return // best-effort

  const data = await res.json()
  const services: { Id: number; Name: string }[] = data.ClientServices ?? []
  const privileeServices = services.filter(s => s.Name.toLowerCase().includes('privilee'))

  // Set expiration to yesterday on each Privilee service found
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] + 'T00:00:00'

  await Promise.all(privileeServices.map(svc =>
    fetch(`${MBO_BASE}/client/updateclientservice`, {
      method: 'POST',
      headers: headers(token, siteId),
      body: JSON.stringify({
        ClientId: clientId,
        ServiceId: svc.Id,
        ExpirationDate: yesterday,
      }),
    })
  ))
}

export async function POST(req: NextRequest) {
  const { classId, clientId, siteId, lateCancel } = await req.json()

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
