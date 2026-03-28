'use client'
import { useEffect, useState } from 'react'

interface KPIs {
  totalBookings: number
  uniqueClients: number
  cancelRate: number
  repeatRate: number
}

interface DailyTrend {
  date: string
  bookings: number
  cancellations: number
}

interface StudioSplit {
  studio: string
  count: number
}

interface TimeSlot {
  time: string
  count: number
}

interface ClassRank {
  className: string
  bookings: number
  cancellations: number
  cancelRate: number
}

interface CancellationBreakdown {
  early: number
  late: number
  earlyPct: number
  latePct: number
}

interface RepeatClient {
  name: string
  count: number
  lastDate: string
}

interface InsightsData {
  kpis: KPIs
  dailyTrend: DailyTrend[]
  studioSplit: StudioSplit[]
  timeDistribution: TimeSlot[]
  classRanking: ClassRank[]
  cancellationBreakdown: CancellationBreakdown
  repeatClients: RepeatClient[]
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
    <h2
      style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.12em',
        color: 'var(--text-muted)',
        marginBottom: '12px',
      }}
    >
      {children}
    </h2>
  )
}

export default function InsightsView() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/insights', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              height: '80px',
              borderRadius: '12px',
              background: 'var(--card)',
              opacity: 1 - i * 0.15,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <p style={{ fontSize: '12px', marginTop: '16px', color: 'var(--text-muted)' }}>
        Could not load insights.
      </p>
    )
  }

  const { kpis, dailyTrend, studioSplit, timeDistribution, classRanking, cancellationBreakdown, repeatClients } = data

  const maxDaily = Math.max(...dailyTrend.map(d => d.bookings + d.cancellations), 1)
  const maxStudio = Math.max(...studioSplit.map(s => s.count), 1)
  const maxTime = Math.max(...timeDistribution.map(t => t.count), 1)

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--border)',
        }}
      >
        <KPICard label="Total Bookings" value={kpis.totalBookings} color="var(--accent)" />
        <KPICard label="Unique Clients" value={kpis.uniqueClients} color="var(--text)" />
        <KPICard
          label="Cancel Rate"
          value={`${kpis.cancelRate}%`}
          color={kpis.cancelRate > 15 ? 'var(--red)' : 'var(--green)'}
        />
        <KPICard label="Repeat Rate" value={`${kpis.repeatRate}%`} color="var(--green)" />
      </div>

      {/* Daily Trend */}
      <section>
        <SectionTitle>Daily Trend (Last 30 Days)</SectionTitle>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {dailyTrend.map(d => (
            <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '60px',
                  flexShrink: 0,
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDate(d.date)}
              </span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px' }}>
                <div
                  style={{
                    height: '18px',
                    width: `${(d.bookings / maxDaily) * 100}%`,
                    background: 'var(--accent)',
                    borderRadius: d.cancellations > 0 ? '4px 0 0 4px' : '4px',
                    minWidth: d.bookings > 0 ? '4px' : '0',
                    transition: 'width 0.3s ease',
                  }}
                />
                {d.cancellations > 0 && (
                  <div
                    style={{
                      height: '18px',
                      width: `${(d.cancellations / maxDaily) * 100}%`,
                      background: 'var(--red)',
                      borderRadius: '0 4px 4px 0',
                      minWidth: '4px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  width: '36px',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {d.bookings + d.cancellations}
              </span>
            </div>
          ))}
          {dailyTrend.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              No data yet.
            </p>
          )}
        </div>
      </section>

      {/* Studio Split */}
      <section>
        <SectionTitle>Studio Split</SectionTitle>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {studioSplit.map(s => {
            const color = STUDIO_COLORS[s.studio] ?? 'var(--text-muted)'
            return (
              <div key={s.studio} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '100px',
                    flexShrink: 0,
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text)',
                  }}
                >
                  {s.studio}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      height: '22px',
                      width: `${(s.count / maxStudio) * 100}%`,
                      background: color,
                      borderRadius: '6px',
                      minWidth: '8px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    width: '36px',
                    flexShrink: 0,
                    fontSize: '12px',
                    fontWeight: 700,
                    color,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {s.count}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Busiest Times */}
      <section>
        <SectionTitle>Busiest Times</SectionTitle>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {timeDistribution.map(t => (
            <div key={t.time} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '60px',
                  flexShrink: 0,
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.time}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: '18px',
                    width: `${(t.count / maxTime) * 100}%`,
                    background: 'var(--accent)',
                    borderRadius: '4px',
                    minWidth: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{
                  width: '30px',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Most Booked Classes */}
      <section>
        <SectionTitle>Most Booked Classes</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {classRanking.slice(0, 15).map((c, i) => {
            const badgeColor =
              c.cancelRate > 20 ? 'var(--red)' : c.cancelRate > 10 ? 'var(--accent)' : 'var(--green)'
            const badgeBg =
              c.cancelRate > 20
                ? 'var(--red-muted)'
                : c.cancelRate > 10
                  ? 'var(--accent-glow)'
                  : 'var(--green-muted)'
            return (
              <div
                key={c.className}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      width: '20px',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
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
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: badgeBg,
                      color: badgeColor,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.cancelRate}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Cancellation Breakdown */}
      <section>
        <SectionTitle>Cancellation Breakdown</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              Early Cancel
            </span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)' }}>
              {cancellationBreakdown.early}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
              ({cancellationBreakdown.earlyPct}%)
            </span>
          </div>
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderLeft: '3px solid var(--red)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
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

      {/* Repeat Clients */}
      <section>
        <SectionTitle>Repeat Clients</SectionTitle>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {repeatClients.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 16px' }}>
              No repeat clients yet
            </p>
          ) : (
            <div>
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 70px 90px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  Name
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Visits
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Last Visit
                </span>
              </div>
              {/* Table rows */}
              {repeatClients.slice(0, 30).map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 90px',
                    padding: '10px 16px',
                    borderBottom: i < repeatClients.length - 1 && i < 29 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {c.count}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      textAlign: 'right',
                    }}
                  >
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

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--card)', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}
