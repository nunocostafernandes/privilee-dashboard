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
  lateCancels: number
  total: number
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

interface ReportsData {
  month: string
  summary: Summary
  billable: Billable
  weeklyBreakdown: WeekRow[]
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

  const { summary, billable, weeklyBreakdown, clientDetails } = data

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

      {/* 2. Billable to Privilee */}
      <section>
        <SectionTitle>Billable to Privilee</SectionTitle>
        <div style={{
          ...cardStyle,
          borderLeft: '3px solid var(--red)',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Complimentary bookings only (top-up no-shows/late cancels are not billed)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <span style={{
                display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px',
              }}>No Shows</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red)' }}>
                {billable.noShows}
              </span>
            </div>
            <div>
              <span style={{
                display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px',
              }}>Late Cancels</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red)' }}>
                {billable.lateCancels}
              </span>
            </div>
            <div>
              <span style={{
                display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '4px',
              }}>Total Billable</span>
              <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--red)' }}>
                {billable.total}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Weekly Breakdown */}
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

      {/* 4. Client Detail Table */}
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
    </div>
  )
}
