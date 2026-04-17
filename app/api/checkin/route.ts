import { NextRequest, NextResponse } from 'next/server'

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
  const { visitId, siteId, signedIn } = await req.json()

  if (!visitId || !siteId) {
    return NextResponse.json({ error: 'Missing visitId or siteId' }, { status: 400 })
  }

  try {
    const token = await getStaffToken(siteId)

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

    return NextResponse.json({ success: true, signedIn })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('auth')) {
      Object.keys(tokenCache).forEach(k => delete tokenCache[k])
    }
    const message = err instanceof Error ? err.message : 'Check-in failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
