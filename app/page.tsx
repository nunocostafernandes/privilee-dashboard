'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_STUDIO, type Studio } from '@/lib/studios'
import { toDateString } from '@/lib/date-utils'
import StudioTabs from '@/components/StudioTabs'
import DateStrip from '@/components/DateStrip'
import ClassGrid from '@/components/ClassGrid'
import RefreshButton from '@/components/RefreshButton'
import StatsView from '@/components/StatsView'
import ClientSearch from '@/components/ClientSearch'

const AUTO_REFRESH_MS = 15 * 60 * 1000

interface ClassItem {
  classId: number; className: string; startTime: string; endTime: string
  totalBooked: number; maxCapacity: number; waitlistCount: number; bookingCount: number
}

export default function Home() {
  const [studio, setStudio]             = useState<Studio>(DEFAULT_STUDIO)
  const [date, setDate]                 = useState(() => toDateString(new Date()))
  const [classes, setClasses]           = useState<ClassItem[] | null>(null)
  const [loading, setLoading]           = useState(false)
  const [backgroundLoading, setBgLoad]  = useState(false)
  const [error, setError]               = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null)
  const [refreshKey, setRefreshKey]     = useState(0)
  const [privOnly, setPrivOnly]         = useState(true)
  const [activeTab, setActiveTab]       = useState<'classes' | 'history'>('classes')
  const [dayStats, setDayStats]         = useState<Record<string, number>>({})
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchClasses = useCallback(async (isBackground = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (isBackground) {
      setBgLoad(true)
    } else {
      setLoading(true)
      setError(false)
      setRefreshError(false)
    }

    try {
      const res = await fetch(
        `/api/classes?siteId=${studio.siteId}&date=${date}`,
        { signal: controller.signal }
      )
      if (!res.ok) throw new Error('MBO error')
      const data = await res.json()
      setClasses(data)
      setLastUpdated(new Date())
      setRefreshError(false)
      if (isBackground) {
        setRefreshKey(k => k + 1)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => fetchClasses(true), AUTO_REFRESH_MS)
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      if (isBackground) {
        setRefreshError(true)
        timerRef.current = setTimeout(() => fetchClasses(true), AUTO_REFRESH_MS)
      } else {
        setError(true)
        setClasses([])
      }
    } finally {
      if (isBackground) setBgLoad(false)
      else setLoading(false)
    }
  }, [studio, date])

  useEffect(() => {
    setClasses(null)
    fetchClasses(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchClasses(true), AUTO_REFRESH_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [fetchClasses])

  useEffect(() => {
    const startDate = toDateString(new Date())
    fetch(`/api/daystats?siteId=${studio.siteId}&startDate=${startDate}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setDayStats(data) })
      .catch(() => {})
  }, [studio])

  function handleRefresh() {
    fetchClasses(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchClasses(true), AUTO_REFRESH_MS)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'history' && (
                <button
                  onClick={() => setActiveTab('classes')}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--card)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--accent)' }}>
                  Privilee Dashboard
                </p>
                <h1 className="text-xl font-bold tracking-tight leading-none">
                  {activeTab === 'classes' ? studio.name : 'History'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'classes' && (
                <>
                  <a
                    href="/insights"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--card)]"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                  >
                    Insights
                  </a>
                  <a
                    href="/faq"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--card)]"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                  >
                    Guide
                  </a>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--card)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    History
                  </button>
                  <RefreshButton
                    onRefresh={handleRefresh}
                    loading={loading || backgroundLoading}
                    lastUpdated={lastUpdated}
                  />
                </>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'history' ? (
          <StatsView />
        ) : (
          <>
            <ClientSearch />

            {refreshError && (
              <div
                className="mb-4 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'var(--red-muted)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Refresh failed -- showing last data
              </div>
            )}

            <StudioTabs active={studio} onChange={setStudio} />

            <div className="mt-3">
              <DateStrip active={date} onChange={setDate} dayStats={dayStats} />
            </div>

            <div className="mt-4 flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {classes !== null && !loading ? `${classes.length} classes` : ''}
              </span>
              <button
                onClick={() => setPrivOnly(v => !v)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: privOnly ? 'var(--accent-glow)' : 'transparent',
                  color: privOnly ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${privOnly ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                Privilee Only
              </button>
            </div>

            <ClassGrid
              classes={loading ? null : (error ? [] : classes)}
              error={error}
              siteId={studio.siteId}
              studioName={studio.name}
              refreshKey={refreshKey}
              privOnly={privOnly}
            />
          </>
        )}
      </div>
    </div>
  )
}
