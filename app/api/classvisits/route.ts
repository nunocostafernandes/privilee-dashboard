import { NextRequest, NextResponse } from 'next/server'
import { mboFetch } from '@/lib/mbo-client'

interface RawVisit {
  ClientId?: string
  AppointmentStatus?: string
}

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get('classId')
  const siteId  = req.nextUrl.searchParams.get('siteId')

  if (!classId || !siteId) {
    return NextResponse.json({ error: 'Missing classId or siteId' }, { status: 400 })
  }

  try {
    const res = await mboFetch('/class/classvisits', siteId, { ClassID: classId })

    if (!res.ok) {
      return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
    }

    const data = await res.json()
    const rawVisits: RawVisit[] = data.Class?.Visits ?? []

    // Batch-fetch client names using ClientIds (works with API key only)
    const clientIds = Array.from(new Set(rawVisits.map(v => v.ClientId).filter(Boolean))) as string[]
    const nameMap: Record<string, string> = {}

    if (clientIds.length > 0) {
      const url = new URL(`https://api.mindbodyonline.com/public/v6/client/clients`)
      clientIds.forEach(id => url.searchParams.append('ClientIds', id))
      const clientRes = await fetch(url.toString(), {
        headers: {
          'Api-Key': process.env.MBO_API_KEY!,
          'SiteId': siteId,
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
    }

    const visits = rawVisits.map(v => ({
      name:   nameMap[v.ClientId ?? ''] ?? v.ClientId ?? 'Client',
      status: v.AppointmentStatus ?? 'Unknown',
    }))

    return NextResponse.json(visits)
  } catch {
    return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
  }
}
