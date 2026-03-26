import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const siteId = req.nextUrl.searchParams.get('siteId')

  if (!q || q.length < 3 || !siteId) {
    return NextResponse.json([])
  }

  try {
    const res = await fetch(
      `https://api.mindbodyonline.com/public/v6/client/clients?SearchText=${encodeURIComponent(q)}&Limit=6`,
      {
        headers: {
          'Api-Key': process.env.MBO_API_KEY!,
          'SiteId': siteId,
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
