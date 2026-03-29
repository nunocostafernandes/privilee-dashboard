import { NextRequest, NextResponse } from 'next/server'
import { mboFetch } from '@/lib/mbo-client'

export const dynamic = 'force-dynamic'

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

interface RawVisit {
  ClientId?: string
  AppointmentStatus?: string
  ServiceName?: string
}

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get('classId')
  const siteId  = req.nextUrl.searchParams.get('siteId')

  if (!classId || !siteId) {
    return NextResponse.json({ error: 'Missing classId or siteId' }, { status: 400 })
  }

  try {
    const res = await mboFetch('/class/classvisits', siteId, { ClassID: classId }, true)

    if (!res.ok) {
      return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
    }

    const data = await res.json()
    const rawVisits: RawVisit[] = data.Class?.Visits ?? []

    const clientIds = Array.from(new Set(rawVisits.map(v => v.ClientId).filter(Boolean))) as string[]
    const nameMap: Record<string, string> = {}

    // Fetch client names in chunks of 10 using repeated ClientIds params
    const token = await getStaffToken(siteId)
    const CHUNK = 10
    for (let i = 0; i < clientIds.length; i += CHUNK) {
      const chunk = clientIds.slice(i, i + CHUNK)
      const url = new URL(`${MBO_BASE}/client/clients`)
      chunk.forEach(id => url.searchParams.append('ClientIds', id))
      try {
        const clientRes = await fetch(url.toString(), {
          headers: {
            'Content-Type': 'application/json',
            'Api-Key': process.env.MBO_API_KEY!,
            'SiteId': siteId,
            'Authorization': `Bearer ${token}`,
          },
        })
        if (clientRes.ok) {
          const clientData = await clientRes.json()
          for (const c of (clientData.Clients ?? [])) {
            const first = c.FirstName?.trim() ?? ''
            const lastInit = c.LastName?.charAt(0) ?? ''
            nameMap[c.Id] = lastInit ? `${first} ${lastInit}.` : first
          }
        }
      } catch { /* name lookup best-effort */ }
    }

    const visits = rawVisits.map(v => ({
      clientId:    v.ClientId ?? '',
      name:        nameMap[v.ClientId ?? ''] ?? v.ClientId ?? 'Client',
      status:      v.AppointmentStatus ?? 'Unknown',
      serviceName: v.ServiceName ?? '',
    }))

    return NextResponse.json(visits)
  } catch {
    return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
  }
}
