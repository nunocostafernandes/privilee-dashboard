import { NextRequest, NextResponse } from 'next/server'
import { mboFetch, mapVisit } from '@/lib/mbo-client'

export async function GET(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get('classId')
  const siteId  = req.nextUrl.searchParams.get('siteId')

  if (!classId || !siteId) {
    return NextResponse.json({ error: 'Missing classId or siteId' }, { status: 400 })
  }

  try {
    const res = await mboFetch(
      '/class/classvisits',
      siteId,
      { ClassIds: classId },
      true // needs UserToken
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'MBO unavailable' }, { status: 503 })
    }

    const data = await res.json()
    const visits = (data.Visits ?? []).map(mapVisit)

    return NextResponse.json(visits)
  } catch (err: unknown) {
    const msg = (err instanceof Error && err.message.includes('token')) ? 'MBO auth unavailable' : 'MBO unavailable'
    return NextResponse.json({ error: msg }, { status: 503 })
  }
}
