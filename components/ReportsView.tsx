'use client'
import { useEffect, useState } from 'react'

interface Summary {
  totalBookings: number
  attended: number
  noShows: number
  lateCancels: number
  earlyCancels: number
  complimentary: number
  topUps: number
}

interface Billable {
  noShows: number
  noShowsAed: number
  lateCancels: number
  lateCancelsAed: number
  topUps: number
  topUpsAed: number
  excess: number
  total: number
  totalAed: number
}

interface WeekRow {
  week: number
  weekStart: string
  weekEnd: string
  complimentary: number
  topUps: number
  attended: number
  noShows: number
  lateCancels: number
}

interface ClientDetail {
  clientName: string
  clientEmail: string
  emirate: string
  week: number
  classification: 'complimentary' | 'top_up'
  type: string
  attendance: string | null
  className: string
  classDate: string
  classTime: string
  studioName: string
}

interface DailyStudioCell { attended: number; noShow: number; lateCancel: number; topUp: number }
interface DailyClientCell { attended: string[]; noShow: string[]; lateCancel: string[]; topUp: string[] }
interface DailyRow {
  date: string
  studios: Record<string, DailyStudioCell>
  clients: Record<string, DailyClientCell>
  totals: DailyStudioCell
  excess: number
}

interface ReportsData {
  month: string
  summary: Summary
  billable: Billable
  weeklyBreakdown: WeekRow[]
  dailyBreakdown: DailyRow[]
  dailyCap: number
  clientDetails: ClientDetail[]
  availableMonths: string[]
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '16px',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '12px',
    }}>
      {children}
    </h2>
  )
}

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--card)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px',
      }}>
        {label}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
      background: bg, color, whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  )
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function ReportsView() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [month, setMonth] = useState('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [popup, setPopup] = useState<{ title: string; clients: string[] } | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(false)
    const param = month ? `?month=${month}` : ''
    fetch(`/api/reports${param}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (!month && d.month) setMonth(d.month)
        if (d.availableMonths?.length) setAvailableMonths(d.availableMonths)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [month])

  function downloadCSV() {
    if (!data) return
    const headers = ['Client Name', 'Email', 'Class', 'Date', 'Time', 'Studio', 'Emirate', 'Classification', 'Attendance', 'Status']
    const csvRows = [headers.join(',')]
    for (const c of data.clientDetails) {
      const row = [
        `"${(c.clientName || '').replace(/"/g, '""')}"`,
        `"${(c.clientEmail || '').replace(/"/g, '""')}"`,
        `"${(c.className || '').replace(/"/g, '""')}"`,
        c.classDate,
        c.classTime,
        `"${(c.studioName || '').replace(/"/g, '""')}"`,
        c.emirate,
        c.classification === 'complimentary' ? 'Complimentary' : 'Top Up',
        c.attendance === 'attended' ? 'Attended' : c.attendance === 'no_show' ? 'No Show' : '-',
        c.type === 'booking' ? 'Booking' : c.type === 'early_cancel' ? 'Early Cancel' : 'Late Cancel',
      ]
      csvRows.push(row.join(','))
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `privilee-report-${data.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse" style={{
            height: '80px', borderRadius: '12px', background: 'var(--card)', opacity: 1 - i * 0.15,
          }} />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return <p style={{ fontSize: '12px', marginTop: '16px', color: 'var(--text-muted)' }}>Could not load reports.</p>
  }

  const { summary, weeklyBreakdown, dailyBreakdown, dailyCap, clientDetails } = data
  const studioNames = ['Alserkal Avenue', 'Town Square', 'Abu Dhabi']
  const studioShort: Record<string, string> = { 'Alserkal Avenue': 'Alserkal', 'Town Square': 'Town Sq.', 'Abu Dhabi': 'Abu Dhabi' }

  async function syncDay(date: string) {
    setSyncing(date)
    setToast(null)
    try {
      const syncRes = await fetch(`/api/attendance-sync?date=${date}`, { cache: 'no-store' })
      const syncData = await syncRes.json()
      // Re-fetch report data
      const param = month !== defaultMonth ? `?month=${month}` : ''
      const res = await fetch(`/api/reports${param}`, { cache: 'no-store' })
      const d = await res.json()
      setData(d)
      const day = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      setToast(`Synced ${day}: ${syncData.synced ?? 0} bookings updated`)
      setTimeout(() => setToast(null), 4000)
    } catch {
      setToast('Sync failed')
      setTimeout(() => setToast(null), 3000)
    }
    setSyncing(null)
  }

  const defaultMonth = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` })()

  const filtered = clientDetails.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.clientName.toLowerCase().includes(q) || c.clientEmail.toLowerCase().includes(q)
  })

  const displayed = showAll ? filtered : filtered.slice(0, 50)

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Month selector */}
      {availableMonths.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto" style={{ paddingBottom: '4px' }}>
          {availableMonths.map(m => (
            <button
              key={m}
              onClick={() => { setMonth(m); setShowAll(false); setSearch('') }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: month === m ? 'var(--accent)' : 'var(--surface)',
                color: month === m ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${month === m ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: month === m ? '0 2px 8px rgba(249,115,22,0.25)' : 'none',
              }}
            >
              {formatMonthLabel(m)}
            </button>
          ))}
        </div>
      )}

      {/* 1. Summary KPI Strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px',
        borderRadius: '12px', overflow: 'hidden', background: 'var(--border)',
      }}>
        <KPICard label="Total Bookings" value={summary.totalBookings} color="var(--accent)" />
        <KPICard label="Attended" value={summary.attended} color="var(--green)" />
        <KPICard label="No Shows" value={summary.noShows} color="var(--red)" />
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px',
        borderRadius: '12px', overflow: 'hidden', background: 'var(--border)',
        marginTop: '-16px',
      }}>
        <KPICard label="Late Cancels" value={summary.lateCancels} color="var(--red)" />
        <KPICard label="Complimentary" value={summary.complimentary} color="var(--text)" />
        <KPICard label="Top Ups" value={summary.topUps} color="#60a5fa" />
      </div>

      {/* 2. Weekly Breakdown */}
      <section>
        <SectionTitle>Weekly Breakdown</SectionTitle>
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['Week', 'Dates', 'Comp', 'Top Up', 'Attend', 'No Show', 'Late'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: h === 'Week' || h === 'Dates' ? 'left' : 'center',
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeklyBreakdown.map((w, i) => (
                  <tr key={w.week} style={{
                    borderBottom: i < weeklyBreakdown.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>W{w.week}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatShortDate(w.weekStart)} - {formatShortDate(w.weekEnd)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{w.complimentary}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>{w.topUps}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{w.attended}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: w.noShows > 0 ? 'var(--red)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{w.noShows}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: w.lateCancels > 0 ? 'var(--red)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{w.lateCancels}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent)' }}>Total</td>
                  <td style={{ padding: '10px 12px' }}></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {weeklyBreakdown.reduce((s, w) => s + w.complimentary, 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#60a5fa', fontVariantNumeric: 'tabular-nums' }}>
                    {weeklyBreakdown.reduce((s, w) => s + w.topUps, 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                    {weeklyBreakdown.reduce((s, w) => s + w.attended, 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                    {weeklyBreakdown.reduce((s, w) => s + w.noShows, 0)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                    {weeklyBreakdown.reduce((s, w) => s + w.lateCancels, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Daily Breakdown by Studio */}
      {dailyBreakdown && dailyBreakdown.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionTitle>Daily Breakdown by Studio (Cap: {dailyCap}/day)</SectionTitle>
            <button
              onClick={() => {
                const headers = ['Day', ...studioNames.flatMap(s => [`${studioShort[s]} Attended`, `${studioShort[s]} No-Show`, `${studioShort[s]} Late Cancel`, `${studioShort[s]} Top Up`]), 'Total Attended', 'Total No-Show', 'Total Late Cancel', 'Total Top Up', 'Excess']
                const csvRows = dailyBreakdown.map(d => {
                  const day = new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  const cells = studioNames.flatMap(s => {
                    const c = d.studios[s] || { attended: 0, noShow: 0, lateCancel: 0, topUp: 0 }
                    return [c.attended, c.noShow, c.lateCancel, c.topUp]
                  })
                  return [day, ...cells, d.totals.attended, d.totals.noShow, d.totals.lateCancel, d.totals.topUp, d.excess].join(',')
                })
                const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv' })
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = `privilee-daily-${data.month}.csv`; a.click()
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Daily Summary
            </button>
          </div>
          <div style={{ ...cardStyle, padding: 0, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th rowSpan={2} style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 1 }}>Day</th>
                  {studioNames.map(s => (
                    <th key={s} colSpan={4} style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid var(--border)' }}>{studioShort[s]}</th>
                  ))}
                  <th colSpan={4} style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid var(--border)' }}>Totals</th>
                  <th rowSpan={2} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid var(--border)' }}>Excess</th>
                  <th rowSpan={2} style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid var(--border)', width: '40px' }}>Sync</th>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[...studioNames, 'Totals'].flatMap(() => ['a', 'x', 'lc', '+']).map((icon, i) => (
                    <th key={i} style={{ padding: '4px 6px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', borderLeft: i % 4 === 0 ? '1px solid var(--border)' : 'none' }}>
                      {icon === 'a' ? '\u2714' : icon === 'x' ? '\u2718' : icon === 'lc' ? '\u23F0' : '+'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((d, idx) => {
                  const dayNum = new Date(d.date + 'T00:00:00').getDate()
                  return (
                    <tr key={d.date} style={{ borderBottom: idx < dailyBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text)', position: 'sticky', left: 0, background: 'var(--card)', zIndex: 1, fontVariantNumeric: 'tabular-nums' }}>{dayNum}</td>
                      {studioNames.map(s => {
                        const c = d.studios[s] || { attended: 0, noShow: 0, lateCancel: 0, topUp: 0 }
                        const cl = d.clients?.[s] || { attended: [], noShow: [], lateCancel: [], topUp: [] }
                        const click = (title: string, list: string[]) => list.length > 0 ? () => setPopup({ title, clients: list }) : undefined
                        const cellStyle = (color: string, border?: boolean): React.CSSProperties => ({ padding: '6px 6px', textAlign: 'center', color, fontWeight: 600, fontVariantNumeric: 'tabular-nums', borderLeft: border ? '1px solid var(--border)' : 'none', cursor: c.attended > 0 || c.noShow > 0 || c.lateCancel > 0 || c.topUp > 0 ? 'pointer' : 'default' })
                        return [
                          <td key={`${s}-a`} style={cellStyle('var(--green)', true)} onClick={click(`${studioShort[s]} - Attended (Day ${dayNum})`, cl.attended)}>{c.attended || ''}</td>,
                          <td key={`${s}-x`} style={cellStyle('var(--red)')} onClick={click(`${studioShort[s]} - No Show (Day ${dayNum})`, cl.noShow)}>{c.noShow || ''}</td>,
                          <td key={`${s}-lc`} style={cellStyle('var(--accent)')} onClick={click(`${studioShort[s]} - Late Cancel (Day ${dayNum})`, cl.lateCancel)}>{c.lateCancel || ''}</td>,
                          <td key={`${s}-t`} style={cellStyle('#60a5fa')} onClick={click(`${studioShort[s]} - Top Up (Day ${dayNum})`, cl.topUp)}>{c.topUp || ''}</td>,
                        ]
                      })}
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--green)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)' }}>{d.totals.attended}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--red)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.totals.noShow || ''}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.totals.lateCancel || ''}</td>
                      <td style={{ padding: '6px 6px', textAlign: 'center', color: '#60a5fa', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.totals.topUp || ''}</td>
                      <td style={{
                        padding: '6px 10px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        borderLeft: '1px solid var(--border)',
                        color: d.excess > 0 ? 'var(--red)' : 'var(--green)',
                        background: d.excess > 0 ? 'var(--red-muted)' : d.excess === 0 ? 'var(--green-muted)' : 'transparent',
                        borderRadius: '0',
                      }}>{d.excess}</td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <button
                          onClick={() => syncDay(d.date)}
                          disabled={syncing === d.date}
                          className="cursor-pointer"
                          style={{ background: 'none', border: 'none', color: syncing === d.date ? 'var(--accent)' : 'var(--text-muted)', padding: '2px' }}
                          title={`Sync attendance for ${d.date}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing === d.date ? 'animate-spin' : ''}>
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface)' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text)', position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }} colSpan={1}>TOTAL</td>
                  {studioNames.map(s => {
                    const totA = dailyBreakdown.reduce((sum, d) => sum + (d.studios[s]?.attended || 0), 0)
                    const totX = dailyBreakdown.reduce((sum, d) => sum + (d.studios[s]?.noShow || 0), 0)
                    const totLC = dailyBreakdown.reduce((sum, d) => sum + (d.studios[s]?.lateCancel || 0), 0)
                    const totT = dailyBreakdown.reduce((sum, d) => sum + (d.studios[s]?.topUp || 0), 0)
                    return [
                      <td key={`${s}-ta`} style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--green)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)' }}>{totA}</td>,
                      <td key={`${s}-tx`} style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--red)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totX}</td>,
                      <td key={`${s}-tlc`} style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totLC}</td>,
                      <td key={`${s}-tt`} style={{ padding: '10px 6px', textAlign: 'center', color: '#60a5fa', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totT}</td>,
                    ]
                  })}
                  <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--green)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)' }}>{dailyBreakdown.reduce((s, d) => s + d.totals.attended, 0)}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--red)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dailyBreakdown.reduce((s, d) => s + d.totals.noShow, 0)}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'center', color: 'var(--accent)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dailyBreakdown.reduce((s, d) => s + d.totals.lateCancel, 0)}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'center', color: '#60a5fa', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dailyBreakdown.reduce((s, d) => s + d.totals.topUp, 0)}</td>
                  <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid var(--border)', color: 'var(--red)' }}>{dailyBreakdown.reduce((s, d) => s + d.excess, 0)}</td>
                  <td style={{ borderLeft: '1px solid var(--border)' }} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Client Detail Table */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <SectionTitle>Client Details</SectionTitle>
          <button
            onClick={downloadCSV}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            Download CSV
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowAll(false) }}
            style={{
              width: '100%', padding: '10px 14px', fontSize: '13px',
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '10px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  {['Client', 'Class', 'Date', 'Studio', 'Emirate', 'Type', 'Attendance', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 10px', textAlign: 'left',
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((c, i) => (
                  <tr key={`${c.clientEmail}-${c.classDate}-${c.classTime}-${i}`} style={{
                    borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    <td style={{ padding: '10px 10px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '12px' }}>{c.clientName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{c.clientEmail}</div>
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text)', fontWeight: 500, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.className}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatShortDate(c.classDate)} {c.classTime}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {c.studioName}
                    </td>
                    <td style={{ padding: '10px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {c.emirate}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      {c.classification === 'complimentary'
                        ? <Badge text="Comp" color="var(--text)" bg="rgba(255,255,255,0.08)" />
                        : <Badge text="Top Up" color="#60a5fa" bg="rgba(96,165,250,0.12)" />
                      }
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      {c.attendance === 'attended'
                        ? <Badge text="Attended" color="var(--green)" bg="var(--green-muted)" />
                        : c.attendance === 'no_show'
                          ? <Badge text="No Show" color="var(--red)" bg="var(--red-muted)" />
                          : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                      }
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      {c.type === 'booking'
                        ? <Badge text="Booking" color="var(--green)" bg="var(--green-muted)" />
                        : c.type === 'early_cancel'
                          ? <Badge text="Early Cancel" color="var(--accent)" bg="var(--accent-glow)" />
                          : <Badge text="Late Cancel" color="var(--red)" bg="var(--red-muted)" />
                      }
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {search ? 'No matching clients.' : 'No data for this month.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!showAll && filtered.length > 50 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button
                onClick={() => setShowAll(true)}
                className="text-xs font-semibold cursor-pointer"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', padding: '4px 12px' }}
              >
                Show all {filtered.length} rows
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 60, padding: '10px 20px', borderRadius: '12px',
          background: toast.includes('failed') ? 'var(--red)' : 'var(--green)',
          color: '#fff', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      {/* Client list popup */}
      {popup && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setPopup(null)}
        >
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', maxWidth: '440px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{popup.title}</h3>
              <button onClick={() => setPopup(null)} className="cursor-pointer" style={{ background: 'var(--surface)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, marginBottom: '8px' }}>{popup.clients.length} client{popup.clients.length !== 1 ? 's' : ''}</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {popup.clients.map((c, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < popup.clients.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px', color: 'var(--text)' }}>
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
