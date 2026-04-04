import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('privilee_bookings')
    .select('client_name, client_email, client_mobile, class_name, class_date, class_time, studio_name, type')
    .or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%,client_mobile.ilike.%${q}%`)
    .order('class_date', { ascending: false })
    .limit(20)

  return NextResponse.json(data ?? [])
}
