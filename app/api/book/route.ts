import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'

// Privilee service name per studio siteId
const PRIVILEE_SERVICE_NAME: Record<string, string> = {
  '564676':  'Privilee-single session',
  '5741777': 'TS-Privilee-Single Session',
  '415190':  'AUH-Privilee-single session',
}

// In-memory caches (reset on process restart)
const tokenCache: Record<string, { token: string; expiry: number }> = {}
const serviceIdCache: Record<string, number> = {}

async function getStaffToken(siteId: string): Promise<string> {
  const cached = tokenCache[siteId]
  if (cached && Date.now() < cached.expiry) return cached.token

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.Error?.Message ?? 'MBO staff authentication failed -- check credentials')
  }

  const data = await res.json()
  tokenCache[siteId] = { token: data.AccessToken, expiry: Date.now() + 6 * 60 * 60 * 1000 }
  return data.AccessToken
}

function headers(token: string, siteId: string) {
  return {
    'Content-Type': 'application/json',
    'Api-Key': process.env.MBO_API_KEY!,
    'SiteId': siteId,
    'Authorization': `Bearer ${token}`,
  }
}

async function getPrivileeServiceId(token: string, siteId: string): Promise<number> {
  if (serviceIdCache[siteId]) return serviceIdCache[siteId]

  const res = await fetch(`${MBO_BASE}/sale/services?Limit=200`, {
    headers: headers(token, siteId),
  })
  if (!res.ok) throw new Error('Failed to fetch MBO services')

  const data = await res.json()
  const targetName = PRIVILEE_SERVICE_NAME[siteId]
  const service = (data.Services ?? []).find(
    (s: { Name: string; Id: number }) => s.Name.toLowerCase() === targetName.toLowerCase()
  )
  if (!service) throw new Error(`Privilee service "${targetName}" not found in MBO for this studio`)

  serviceIdCache[siteId] = service.Id
  return service.Id
}

async function findClientByEmail(token: string, siteId: string, email: string): Promise<string | null> {
  const res = await fetch(
    `${MBO_BASE}/client/clients?SearchText=${encodeURIComponent(email)}&Limit=10`,
    { headers: headers(token, siteId) }
  )
  if (!res.ok) return null
  const data = await res.json()
  const match = (data.Clients ?? []).find(
    (c: { Email?: string }) => c.Email?.toLowerCase() === email.toLowerCase()
  )
  return match?.Id ?? null
}

async function createMboClient(
  token: string, siteId: string,
  firstName: string, lastName: string, email: string, mobile: string
): Promise<string> {
  const res = await fetch(`${MBO_BASE}/client/addclient`, {
    method: 'POST',
    headers: headers(token, siteId),
    body: JSON.stringify({
      FirstName: firstName, LastName: lastName, Email: email, MobilePhone: mobile,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.Error?.Message ?? 'Failed to create client in MBO')
  }
  const data = await res.json()
  return data.Client?.Id
}

async function sellPrivileeService(token: string, siteId: string, clientId: string, serviceId: number): Promise<void> {
  const res = await fetch(`${MBO_BASE}/sale/checkoutshoppingcart`, {
    method: 'POST',
    headers: headers(token, siteId),
    body: JSON.stringify({
      ClientId: clientId,
      Items: [
        {
          Item: { Type: 'Service', Metadata: { Id: serviceId } },
          Quantity: 1,
          DiscountAmount: 0,
        },
      ],
      Payments: [{ Type: 'Custom', Metadata: { Amount: 0, id: 18 } }],
      Test: false,
      SendEmail: false,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.Error?.Message ?? 'Failed to sell Privilee service')
  }
}

async function getClientPrivileeServiceId(
  token: string, siteId: string, clientId: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `${MBO_BASE}/client/clientservices?ClientId=${clientId}&CrossRegionalLookup=false`,
      { headers: headers(token, siteId) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const match = (data.ClientServices ?? []).find(
      (cs: { Id: number; Remaining: number; Name: string; Program?: { Id: number } }) =>
        cs.Name?.toLowerCase().includes('privilee') && cs.Remaining > 0
    )
    return match?.Id ?? null
  } catch {
    return null
  }
}

async function bookClass(
  token: string, siteId: string, classId: number, clientId: string, clientServiceId?: number | null
): Promise<number | null> {
  const payload: Record<string, unknown> = {
    ClassId: classId,
    ClientId: clientId,
    Test: false,
    SendEmail: false,
  }
  if (clientServiceId) {
    payload.ClientServiceId = clientServiceId
  }

  const res = await fetch(`${MBO_BASE}/class/addclienttoclass`, {
    method: 'POST',
    headers: headers(token, siteId),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.Error?.Message ?? 'Failed to book class')
  }
  const data = await res.json()
  return data.Visit?.Id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { classId, siteId, studioName, className, startTime, firstName, lastName, email, mobile } = body

  if (!classId || !siteId || !firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Staff token
    const token = await getStaffToken(siteId)

    // 2. Find or create client
    let clientId = await findClientByEmail(token, siteId, email)
    const isNewClient = !clientId
    if (!clientId) {
      clientId = await createMboClient(token, siteId, firstName, lastName, email, mobile ?? '')
    }

    // 3. Get Privilee service ID
    const serviceId = await getPrivileeServiceId(token, siteId)

    // 4. Sell at 0 AED
    await sellPrivileeService(token, siteId, clientId, serviceId)

    // 5. Find the Privilee ClientServiceId so MBO uses it (not another active package)
    const clientServiceId = await getClientPrivileeServiceId(token, siteId, clientId)

    // 6. Book class with the Privilee service pinned
    const bookingId = await bookClass(token, siteId, classId, clientId, clientServiceId)

    // 7. Log to Supabase
    const d = new Date(startTime)
    const classDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const classTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    const { error: insertError } = await supabase.from('privilee_bookings').insert({
      studio_name:    studioName,
      studio_site_id: siteId,
      class_id:       classId,
      class_name:     className,
      class_date:     classDate,
      class_time:     classTime,
      client_id:      clientId,
      client_name:    `${firstName} ${lastName}`.trim(),
      client_email:   email,
      client_mobile:  mobile ?? null,
      mbo_booking_id: bookingId ?? null,
    })

    // Duplicate booking (unique index violation) -- treat as success
    if (insertError?.code === '23505') {
      return NextResponse.json({ success: true, clientId, isNewClient, bookingId, duplicate: true })
    }

    return NextResponse.json({ success: true, clientId, isNewClient, bookingId })
  } catch (err: unknown) {
    // Reset token cache on auth failure so next attempt re-fetches
    if (err instanceof Error && err.message.includes('authentication')) {
      Object.keys(tokenCache).forEach(k => delete tokenCache[k])
    }
    const message = err instanceof Error ? err.message : 'Booking failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
