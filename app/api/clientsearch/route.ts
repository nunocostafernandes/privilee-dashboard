import { NextRequest, NextResponse } from 'next/server'

const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'

const tokenCache: Record<string, { token: string; expiry: number }> = {}

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
  if (!res.ok) throw new Error('MBO staff authentication failed')
  const data = await res.json()
  tokenCache[siteId] = { token: data.AccessToken, expiry: Date.now() + 6 * 60 * 60 * 1000 }
  return data.AccessToken
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const siteId = req.nextUrl.searchParams.get('siteId')

  if (!q || q.length < 3 || !siteId) {
    return NextResponse.json([])
  }

  try {
    const token = await getStaffToken(siteId)

    const res = await fetch(
      `${MBO_BASE}/client/clients?SearchText=${encodeURIComponent(q)}&Limit=6`,
      {
        headers: {
          'Api-Key': process.env.MBO_API_KEY!,
          'SiteId': siteId,
          'Authorization': `Bearer ${token}`,
        },
      }
    )
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const clients = (data.Clients ?? []).map((c: {
      Id: string; FirstName?: string; LastName?: string; Email?: string; MobilePhone?: string
    }) => ({
      id: c.Id,
      firstName: c.FirstName ?? '',
      lastName: c.LastName ?? '',
      email: c.Email ?? '',
      mobile: c.MobilePhone ?? '',
    }))

    return NextResponse.json(clients)
  } catch {
    return NextResponse.json([])
  }
}
