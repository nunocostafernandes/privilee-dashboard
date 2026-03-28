import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(url, key)

  const { data, error, count } = await supabase
    .from('privilee_bookings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message, url, keyPrefix: key?.slice(0, 20) }, { status: 500 })
  }

  return NextResponse.json({ rows: data, count, keyRole: key?.includes('service_role') ? 'service_role' : 'anon' })
}
