'use client'
import { useEffect, useState } from 'react'

interface KPIs {
  totalBookings: number
  uniqueClients: number
  cancelRate: number
  repeatRate: number
}

interface DailyTrend { date: string; bookings: number; cancellations: number }
interface StudioSplit { studio: string; count: number }
interface TimeSlot { time: string; count: number }
interface ClassRank { className: string; bookings: number; cancellations: number; cancelRate: number }
interface CancellationBreakdown { early: number; late: number; earlyPct: number; latePct: number }
interface RepeatClient { name: string; count: number; lastDate: string }
interface LeadTime { label: string; count: number; pct: number }
interface BookingHour { hour: number; label: string; count: number }

interface InsightsData {
  kpis: KPIs
  dailyTrend: DailyTrend[]
  studioSplit: StudioSplit[]
  timeDistribution: TimeSlot[]
  classRanking: ClassRank[]
  cancellationBreakdown: CancellationBreakdown
  repeatClients: RepeatClient[]
  leadTime: LeadTime[]
  bookingActivity: BookingHour[]
  studios: string[]
}

const STUDIO_COLORS: Record<string, string> = {
  'Alserkal Avenue': '#f97316',
  'Town Square': '#22c55e',
  'Abu Dhabi': '#60a5fa',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const,
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
        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
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

function HBar({ value, max, color, height = 18 }: { value: number; max: number; color: string; height?: number }) {
  return (
    <div style={{
      height: `${height}px`, width: `${(value / max) * 100}%`,
      background: color, borderRadius: '4px',
      minWidth: value > 0 ? '4px' : '0', transition: 'width 0.3s ease',
    }} />
  )
}

const cardStyle = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '16px',
}

export default function InsightsView() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [studio, setStudio] = useState('All')
  const [studios, setStudios] = useState<string[]>([])

  useEffect(() => {
    setLoading(true)
    const param = studio !== 'All' ? `?studio=${encodeURIComponent(studio)}` : ''
    fetch(`/api/insights${param}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (d.studios?.length) setStudios(d.studios)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [studio])

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
    return <p style={{ fontSize: '12px', marginTop: '16px', color: 'var(--text-muted)' }}>Could not load insights.</p>
  }

  const { kpis, dailyTrend, studioSplit, timeDistribution, classRanking, cancellationBreakdown, repeatClients, leadTime, bookingActivity } = data

  const maxDaily = Math.max(...dailyTrend.map(d => d.bookings + d.cancellations), 1)
  const maxStudio = Math.max(...studioSplit.map(s => s.count), 1)
  const maxTime = Math.max(...timeDistribution.map(t => t.count), 1)
  const maxLead = Math.max(...leadTime.map(l => l.count), 1)
  const maxActivity = Math.max(...bookingActivity.map(h => h.count), 1)

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Studio filter */}
      {studios.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {['All', ...studios].map(s => (
            <button
              key={s}
              onClick={() => setStudio(s)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
              style={{
                background: studio === s ? 'var(--accent)' : 'var(--surface)',
                color: studio === s ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${studio === s ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: studio === s ? '0 2px 8px rgba(249,115,22,0.25)' : 'none',
              }}
            >
              {s === 'All' ? 'All Studios' : STUDIO_COLORS[s] ? s : s}
            </button>
          ))}
        </div>
      )}

      {/* 1. KPI Strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px',
        borderRadius: '12px', overflow: 'hidden', background: 'var(--border)',
      }}>
        <KPICard label="Total Bookings" value={kpis.totalBookings} color="var(--accent)" />
        <KPICard label="Unique Clients" value={kpis.uniqueClients} color="var(--text)" />
        <KPICard label="Cancel Rate" value={`${kpis.cancelRate}%`} color={kpis.cancelRate > 15 ? 'var(--red)' : 'var(--green)'} />
        <KPICard label="Repeat Rate" value={`${kpis.repeatRate}%`} color="var(--green)" />
      </div>

      {/* 2. Daily Trend */}
      <section>
        <SectionTitle>Daily Trend</SectionTitle>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {dailyTrend.map(d => (
            <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '60px', flexShrink: 0, fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(d.date)}
              </span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px' }}>
                <div style={{
                  height: '18px', width: `${(d.bookings / maxDaily) * 100}%`,
                  background: 'var(--accent)', borderRadius: d.cancellations > 0 ? '4px 0 0 4px' : '4px',
                  minWidth: d.bookings > 0 ? '4px' : '0', transition: 'width 0.3s ease',
                }} />
                {d.cancellations > 0 && (
                  <div style={{
                    height: '18px', width: `${(d.cancellations / maxDaily) * 100}%`,
                    background: 'var(--red)', borderRadius: '0 4px 4px 0',
                    minWidth: '4px', transition: 'width 0.3s ease',
                  }} />
                )}
              </div>
              <span style={{ width: '36px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {d.bookings + d.cancellations}
              </span>
            </div>
          ))}
          {dailyTrend.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No data yet.</p>
          )}
        </div>
      </section>

      {/* 3. Studio Split */}
      <section>
        <SectionTitle>Studio Split</SectionTitle>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {studioSplit.map(s => {
            const color = STUDIO_COLORS[s.studio] ?? 'var(--text-muted)'
            return (
              <div key={s.studio} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '100px', flexShrink: 0, fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                  {s.studio}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '22px', width: `${(s.count / maxStudio) * 100}%`,
                    background: color, borderRadius: '6px', minWidth: '8px', transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ width: '36px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {s.count}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 4. Most Booked Classes */}
      <section>
        <SectionTitle>Most Booked Classes</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {classRanking.slice(0, 15).map((c, i) => {
            const badgeColor = c.cancelRate > 20 ? 'var(--red)' : c.cancelRate > 10 ? 'var(--accent)' : 'var(--green)'
            const badgeBg = c.cancelRate > 20 ? 'var(--red-muted)' : c.cancelRate > 10 ? 'var(--accent-glow)' : 'var(--green-muted)'
            return (
              <div key={c.className} style={{
                ...cardStyle, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', width: '20px', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.className}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {c.bookings}
                  </span>
                  {c.cancellations > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {c.cancellations} cancel
                    </span>
                  )}
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                    background: badgeBg, color: badgeColor, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {c.cancelRate}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. Busiest Class Times */}
      <section>
        <SectionTitle>Busiest Class Times</SectionTitle>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {timeDistribution.map(t => (
            <div key={t.time} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '70px', flexShrink: 0, fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {t.time}
              </span>
              <div style={{ flex: 1 }}>
                <HBar value={t.count} max={maxTime} color="var(--accent)" />
              </div>
              <span style={{ width: '30px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {t.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. When Bookings Are Made */}
      <section>
        <SectionTitle>When Bookings Are Made (Dubai Time)</SectionTitle>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {bookingActivity.map(h => (
            <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '50px', flexShrink: 0, fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {h.label}
              </span>
              <div style={{ flex: 1 }}>
                <HBar value={h.count} max={maxActivity} color="#60a5fa" />
              </div>
              <span style={{ width: '30px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {h.count}
              </span>
            </div>
          ))}
          {bookingActivity.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No data yet.</p>
          )}
        </div>
      </section>

      {/* 7. Booking Lead Time */}
      <section>
        <SectionTitle>How Far in Advance</SectionTitle>
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leadTime.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '110px', flexShrink: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {l.label}
              </span>
              <div style={{ flex: 1 }}>
                <HBar value={l.count} max={maxLead} color="var(--accent)" height={22} />
              </div>
              <span style={{ width: '56px', flexShrink: 0, fontSize: '11px', fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {l.count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({l.pct}%)</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Cancellation Breakdown */}
      <section>
        <SectionTitle>Cancellation Breakdown</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={cardStyle}>
            <span style={{
              display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '6px',
            }}>
              Early Cancel
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
              {cancellationBreakdown.early}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
              ({cancellationBreakdown.earlyPct}%)
            </span>
          </div>
          <div style={{ ...cardStyle, borderLeft: '3px solid var(--red)' }}>
            <span style={{
              display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '6px',
            }}>
              Late Cancel
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red)' }}>
              {cancellationBreakdown.late}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
              ({cancellationBreakdown.latePct}%)
            </span>
          </div>
        </div>
      </section>

      {/* 9. Repeat Clients */}
      <section>
        <SectionTitle>Repeat Clients</SectionTitle>
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          {repeatClients.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 16px' }}>
              No repeat clients yet
            </p>
          ) : (
            <div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 70px 90px',
                padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Name</span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'center' }}>Visits</span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'right' }}>Last Visit</span>
              </div>
              {repeatClients.slice(0, 30).map((c, i) => (
                <div key={`${c.name}-${i}`} style={{
                  display: 'grid', gridTemplateColumns: '1fr 70px 90px',
                  padding: '10px 16px',
                  borderBottom: i < repeatClients.length - 1 && i < 29 ? '1px solid var(--border)' : 'none',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {c.count}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {formatDate(c.lastDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
