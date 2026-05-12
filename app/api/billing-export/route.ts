import { NextRequest, NextResponse } from 'next/server'
import { mboFetch } from '@/lib/mbo-client'
import { STUDIOS } from '@/lib/studios'

export const dynamic = 'force-dynamic'
export const maxDuration = 800

// Raw MBO scan endpoint for monthly billing.
// Pulls every Privilee-tagged visit from MBO for the given month, across all 3 studios.
// Classification into complimentary vs top-up happens client-side (Python invoice script)
// using the per-week-per-emirate contract rule. Here we just emit raw visit data.

interface MboVisit {
  ClientId?: string
  ClientService?: { Name?: string }
  ServiceName?: string
  AppointmentStatus?: string
  SignedIn?: boolean
  Id?: number
}

interface MboClassRaw {
  Id: number
  ClassDescription?: { Name?: string }
  StartDateTime: string
}

interface ExportVisit {
  studio: string
  classId: number
  className: string
  classDate: string    // YYYY-MM-DD
  classTime: string    // HH:MM (24h)
  clientId: string
  clientName: string
  clientEmail: string
  serviceName: string
  appointmentStatus: string
  signedIn: boolean
  visitId: number | null
  // Outcome per the dashboard's canonical classification rules:
  outcome: 'attended' | 'no_show' | 'late_cancel' | 'unknown'
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function classifyOutcome(v: MboVisit): ExportVisit['outcome'] {
  // Mirrors attendance-sync logic:
  //   SignedIn=true                                       => attended
  //   AppointmentStatus in ('LateCanceled', 'Cancelled')  => late_cancel
  //   otherwise (in roster, not signed in, not cancelled) => no_show
  // Visits absent from MBO roster aren't reachable here (we get them from /classvisits).
  if (v.SignedIn === true) return 'attended'
  const s = v.AppointmentStatus ?? ''
  if (s === 'LateCanceled' || s === 'Cancelled') return 'late_cancel'
  return 'no_show'
}

function isPrivileeService(v: MboVisit): boolean {
  const name = (v.ClientService?.Name ?? v.ServiceName ?? '').toLowerCase()
  return name.includes('privilee')
}

async function fetchClassesForDateRange(siteId: string, start: string, end: string): Promise<MboClassRaw[]> {
  // MBO paginates /class/classes (default limit 100). Iterate with Offset until empty.
  const PAGE = 200
  let offset = 0
  const all: MboClassRaw[] = []
  for (;;) {
    const res = await mboFetch('/class/classes', siteId, {
      StartDateTime: `${start}T00:00:00`,
      EndDateTime: `${end}T23:59:59`,
      Limit: String(PAGE),
      Offset: String(offset),
    })
    if (!res.ok) throw new Error(`MBO classes failed: ${res.status}`)
    const data = await res.json()
    const batch = (data.Classes ?? []) as MboClassRaw[]
    all.push(...batch)
    if (batch.length < PAGE) break
    offset += PAGE
    if (offset > 10000) break  // safety
  }
  return all
}

async function fetchVisits(siteId: string, classId: number): Promise<MboVisit[]> {
  const res = await mboFetch('/class/classvisits', siteId, { ClassID: String(classId) })
  if (!res.ok) return []
  const data = await res.json()
  return (data.Class?.Visits ?? []) as MboVisit[]
}

async function fetchClientDetails(siteId: string, clientIds: string[]): Promise<Record<string, { name: string; email: string }>> {
  if (clientIds.length === 0) return {}
  const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'
  const tokenRes = await fetch(`${MBO_BASE}/usertoken/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': process.env.MBO_API_KEY!, 'SiteId': siteId },
    body: JSON.stringify({ Username: process.env.MBO_USERNAME!, Password: process.env.MBO_PASSWORD! }),
  })
  if (!tokenRes.ok) return {}
  const { AccessToken } = await tokenRes.json()
  const map: Record<string, { name: string; email: string }> = {}
  const CHUNK = 10
  for (let i = 0; i < clientIds.length; i += CHUNK) {
    const chunk = clientIds.slice(i, i + CHUNK)
    const url = new URL(`${MBO_BASE}/client/clients`)
    chunk.forEach(id => url.searchParams.append('ClientIds', id))
    try {
      const r = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.MBO_API_KEY!,
          'SiteId': siteId,
          'Authorization': `Bearer ${AccessToken}`,
        },
      })
      if (r.ok) {
        const d = await r.json()
        for (const c of (d.Clients ?? [])) {
          const first = (c.FirstName ?? '').trim()
          const last = (c.LastName ?? '').trim()
          map[c.Id] = {
            name: `${first} ${last}`.trim() || c.Id,
            email: (c.Email ?? '').trim().toLowerCase(),
          }
        }
      }
    } catch { /* best effort */ }
  }
  return map
}

export async function GET(req: NextRequest) {
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? '', 10)
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? '', 10)
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  const days = lastDayOfMonth(year, month)
  const monthStr = String(month).padStart(2, '0')
  const start = `${year}-${monthStr}-01`
  const end = `${year}-${monthStr}-${String(days).padStart(2, '0')}`

  const allVisits: ExportVisit[] = []
  const errors: string[] = []

  for (const studio of STUDIOS) {
    try {
      const classes = await fetchClassesForDateRange(studio.siteId, start, end)
      const collected: { cls: MboClassRaw; visit: MboVisit }[] = []

      for (const cls of classes) {
        try {
          const visits = await fetchVisits(studio.siteId, cls.Id)
          for (const v of visits) {
            if (!isPrivileeService(v)) continue
            collected.push({ cls, visit: v })
          }
        } catch (e) {
          errors.push(`Studio ${studio.name} class ${cls.Id}: ${(e as Error).message}`)
        }
      }

      const clientIds = Array.from(new Set(collected.map(x => x.visit.ClientId).filter(Boolean))) as string[]
      const details = await fetchClientDetails(studio.siteId, clientIds)

      for (const { cls, visit } of collected) {
        const startDt = new Date(cls.StartDateTime)
        const dateStr = startDt.toISOString().slice(0, 10)
        const timeStr = startDt.toISOString().slice(11, 16)
        const det = details[visit.ClientId ?? ''] ?? { name: '', email: '' }
        allVisits.push({
          studio: studio.name,
          classId: cls.Id,
          className: cls.ClassDescription?.Name ?? '',
          classDate: dateStr,
          classTime: timeStr,
          clientId: visit.ClientId ?? '',
          clientName: det.name,
          clientEmail: det.email,
          serviceName: visit.ClientService?.Name ?? visit.ServiceName ?? '',
          appointmentStatus: visit.AppointmentStatus ?? '',
          signedIn: visit.SignedIn === true,
          visitId: visit.Id ?? null,
          outcome: classifyOutcome(visit),
        })
      }
    } catch (e) {
      errors.push(`Studio ${studio.name}: ${(e as Error).message}`)
    }
  }

  return NextResponse.json({
    year,
    month,
    visits: allVisits,
    errors,
    visitCount: allVisits.length,
  })
}
