'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_STUDIO, type Studio } from '@/lib/studios'
import { toDateString } from '@/lib/date-utils'
import StudioTabs from '@/components/StudioTabs'
import DateStrip from '@/components/DateStrip'
import ClassGrid from '@/components/ClassGrid'
import RefreshButton from '@/components/RefreshButton'
import StatsView from '@/components/StatsView'

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
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-widest mb-0.5">Privilee Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {activeTab === 'classes' ? studio.name : 'History'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'classes' ? (
              <>
                <a
                  href="/faq"
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Guide
                </a>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  History
                </button>
                <RefreshButton
                  onRefresh={handleRefresh}
                  loading={loading || backgroundLoading}
                  lastUpdated={lastUpdated}
                />
              </>
            ) : (
              <button
                onClick={() => setActiveTab('classes')}
                className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Classes
              </button>
            )}
          </div>
        </div>

        {activeTab === 'history' ? (
          <StatsView />
        ) : (
          <>
            {refreshError && (
              <div className="mb-4 px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--red)] text-sm text-[var(--text-muted)]">
                Refresh failed — showing last data
              </div>
            )}

            <div className="mb-4">
              <StudioTabs active={studio} onChange={setStudio} />
            </div>
            <DateStrip active={date} onChange={setDate} dayStats={dayStats} />

            <div className="mt-4 flex justify-end mb-3">
              <button
                onClick={() => setPrivOnly(v => !v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  privOnly
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'bg-transparent border-[var(--border)] text-[var(--text-muted)]'
                }`}
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
