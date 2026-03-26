import { NextRequest, NextResponse } from 'next/server'
import { mboFetch, mapClass } from '@/lib/mbo-client'

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')
  const date   = req.nextUrl.searchParams.get('date')

  if (!siteId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing siteId or date' }, { status: 400 })
  }

  try {
    const res = await mboFetch('/class/classes', siteId, {
      StartDateTime: `${date}T00:00:00`,
      EndDateTime:   `${date}T23:59:59`,
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
    }

    const data = await res.json()
    const classes = (data.Classes ?? [])
      .map(mapClass)
      .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))

    return NextResponse.json(classes)
  } catch {
    return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
  }
}
