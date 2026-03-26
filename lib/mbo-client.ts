const MBO_BASE = 'https://api.mindbodyonline.com/public/v6'
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getUserToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken

  const res = await fetch(`${MBO_BASE}/usertoken/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.MBO_API_KEY!,
      'SiteId': '-99',
    },
    body: JSON.stringify({
      Username: process.env.MBO_USERNAME!,
      Password: process.env.MBO_PASSWORD!,
    }),
  })

  if (!res.ok) throw new Error(`MBO token issue failed: ${res.status}`)

  const data = await res.json()
  cachedToken = data.AccessToken
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS
  return cachedToken!
}

export async function mboFetch(
  path: string,
  siteId: string,
  params: Record<string, string>,
  needsUserToken = false
): Promise<Response> {
  const url = new URL(`${MBO_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const buildHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Api-Key': process.env.MBO_API_KEY!,
      'SiteId': siteId,
    }
    if (needsUserToken) {
      const token = await getUserToken()
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  let res = await fetch(url.toString(), { headers: await buildHeaders() })

  // On 401: clear cached token and retry once
  if (res.status === 401 && needsUserToken) {
    cachedToken = null
    tokenExpiresAt = 0
    res = await fetch(url.toString(), { headers: await buildHeaders() })
  }

  return res
}

interface MboRawClass {
  Id: number
  ClassDescription?: { Name?: string }
  StartDateTime: string
  EndDateTime: string
  TotalBooked?: number
  MaxCapacity?: number
  TotalBookedWaitlist?: number
  WaitListSize?: number
}

export function mapClass(raw: MboRawClass) {
  return {
    classId:       raw.Id,
    className:     raw.ClassDescription?.Name ?? '',
    startTime:     raw.StartDateTime,
    endTime:       raw.EndDateTime,
    totalBooked:   raw.TotalBooked ?? 0,
    maxCapacity:   raw.MaxCapacity ?? 0,
    waitlistCount: raw.WaitListSize ?? raw.TotalBookedWaitlist ?? 0,
  }
}

interface MboRawVisit {
  Client?: { FirstName?: string; LastName?: string }
  AppointmentStatus?: string
}

export function mapVisit(raw: MboRawVisit) {
  const first = raw.Client?.FirstName ?? ''
  const last  = raw.Client?.LastName?.charAt(0) ?? ''
  return {
    name:   `${first} ${last}.`,
    status: raw.AppointmentStatus ?? 'Unknown',
  }
}
