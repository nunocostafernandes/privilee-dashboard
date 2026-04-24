'use client'
import { useState, useEffect } from 'react'
import BookingModal from './BookingModal'

interface ClassItem {
  classId: number
  className: string
  startTime: string
  endTime: string
  totalBooked: number
  maxCapacity: number
  waitlistCount: number
  bookingCount: number
  privileeCount?: number
}

interface Visit {
  clientId: string
  name: string
  firstName?: string
  lastName?: string
  email?: string
  status: string
  serviceName: string
  visitId?: number | null
  signedIn?: boolean
}

interface Props {
  cls: ClassItem
  siteId: string
  studioName: string
  refreshKey: number
  privOnly: boolean
}

function pillStyle(totalBooked: number, maxCapacity: number, waitlistCount: number): { bg: string; color: string } {
  if (waitlistCount > 0 || (maxCapacity > 0 && totalBooked >= maxCapacity))
    return { bg: 'var(--red-muted)', color: 'var(--red)' }
  if (maxCapacity > 0 && totalBooked / maxCapacity >= 0.8)
    return { bg: 'var(--accent-glow)', color: 'var(--accent)' }
  return { bg: 'var(--green-muted)', color: 'var(--green)' }
}

function formatTime(dt: string): string {
  const d = new Date(dt)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const GRACE_MS = 20 * 60 * 1000

function isPastClass(startTime: string): boolean {
  return Date.now() > new Date(startTime).getTime() + GRACE_MS
}

export default function ClassCard({ cls, siteId, studioName, refreshKey, privOnly }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [visits, setVisits]           = useState<Visit[] | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [checkingInId, setCheckingInId] = useState<string | null>(null)

  useEffect(() => { setVisits(null) }, [refreshKey])

  const past = isPastClass(cls.startTime)
  const pill = past
    ? { bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)' }
    : pillStyle(cls.totalBooked, cls.maxCapacity, cls.waitlistCount)
  const displayedVisits = visits === null ? null
    : privOnly ? visits.filter(v => v.serviceName.toLowerCase().includes('privilee'))
    : visits

  async function fetchVisits() {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/classvisits?classId=${cls.classId}&siteId=${siteId}`)
      if (!res.ok) throw new Error()
      setVisits(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function toggle() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (visits !== null) return
    fetchVisits()
  }

  function handleAddClick(e: React.MouseEvent) {
    e.stopPropagation()
    setBookingOpen(true)
  }

  async function handleCancel(e: React.MouseEvent, clientId: string, lateCancel: boolean, alreadyCancelled?: boolean) {
    e.stopPropagation()
    setCancellingId(clientId)
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls.classId, clientId, siteId, lateCancel,
          studioName, className: cls.className, startTime: cls.startTime,
          alreadyCancelled: alreadyCancelled ?? false,
          clientName: (() => {
            const v = visits?.find(v => v.clientId === clientId)
            if (!v) return ''
            return (v.firstName || v.lastName) ? `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim() : v.name
          })(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Cancel failed')
      } else {
        setVisits(prev => prev ? prev.filter(v => v.clientId !== clientId) : prev)
      }
    } catch {
      alert('Cancel failed')
    } finally {
      setCancellingId(null)
    }
  }

  async function handleCheckin(e: React.MouseEvent, v: Visit) {
    e.stopPropagation()
    if (!v.visitId) return
    const isCancelled = v.status === 'Cancelled' || v.status === 'LateCanceled'
    const newSignedIn = isCancelled ? true : !v.signedIn
    setCheckingInId(v.clientId)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: v.visitId, siteId, signedIn: newSignedIn,
          ...(isCancelled ? {
            correction: true,
            clientId: v.clientId,
            classId: cls.classId,
            startTime: cls.startTime,
          } : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Check-in failed')
      } else {
        setVisits(prev => prev ? prev.map(visit =>
          visit.clientId === v.clientId ? { ...visit, signedIn: newSignedIn, status: 'Booked' } : visit
        ) : prev)
      }
    } catch {
      alert('Check-in failed')
    } finally {
      setCheckingInId(null)
    }
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden cursor-pointer transition-all"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          opacity: past ? 0.6 : 1,
        }}
        onClick={toggle}
      >
        <div className="flex items-center px-4 py-3.5 gap-3">
          {/* Time */}
          <span
            className="text-xs font-semibold w-[72px] shrink-0 tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {formatTime(cls.startTime)}
          </span>

          {/* Class name */}
          <span className="flex-1 font-semibold text-sm truncate flex items-center gap-2">
            {cls.className}
            {past && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider"
                style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)' }}
              >
                PAST
              </span>
            )}
          </span>

          {/* Count pill: total / privilee */}
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 tabular-nums"
            style={{ background: pill.bg, color: pill.color }}
          >
            {visits !== null ? visits.length : cls.bookingCount}
            {(cls.privileeCount != null && cls.privileeCount > 0) && (
              <span style={{ color: 'var(--accent)' }}>{` / ${cls.privileeCount}P`}</span>
            )}
          </span>

          {/* Add button */}
          <button
            onClick={handleAddClick}
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer"
            style={{
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              border: '1px solid rgba(249,115,22,0.3)',
            }}
            title="Add Privilee client"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Chevron */}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 transition-transform duration-200"
            style={{
              color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Expanded visits */}
        <div
          className="transition-all duration-300"
          style={{
            maxHeight: expanded ? '60vh' : '0',
            overflow: expanded ? 'auto' : 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            {loading && (
              <div className="space-y-2.5">
                {[1,2,3].map(i => (
                  <div key={i} className="h-4 rounded-lg animate-pulse" style={{ background: 'var(--skeleton)', width: `${80 - i * 15}%` }} />
                ))}
              </div>
            )}
            {error && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Could not load clients. Try refreshing.
              </p>
            )}
            {!loading && !error && displayedVisits !== null && displayedVisits.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {privOnly && visits && visits.length > 0 ? 'No Privilee bookings for this class.' : 'No bookings yet.'}
              </p>
            )}
            {!loading && !error && displayedVisits && displayedVisits.length > 0 && (
              <ul className="space-y-1">
                {displayedVisits.map((v, i) => (
                  <li
                    key={i}
                    className="flex justify-between items-center py-2 px-2 rounded-lg transition-colors"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {(v.firstName || v.lastName)
                          ? `${v.firstName ?? ''} ${v.lastName ?? ''}`.trim()
                          : v.name}
                      </span>
                      {v.email && (
                        <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{v.email}</span>
                      )}
                      {v.serviceName
                        ? <span className="block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{v.serviceName}</span>
                        : <span className="block text-xs" style={{ color: 'var(--red)' }}>Unpaid</span>
                      }
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Late Cancelled pill */}
                      {privOnly && (v.status === 'Cancelled' || v.status === 'LateCanceled') && (
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-md"
                          style={{ color: 'var(--red)', background: 'var(--red-muted)' }}
                        >Late Cancelled</span>
                      )}
                      {/* Check-in toggle */}
                      {privOnly && v.visitId && checkingInId === v.clientId ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>
                      ) : privOnly && v.visitId && (
                        <button
                          onClick={e => handleCheckin(e, v)}
                          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          style={v.signedIn
                            ? { color: 'var(--green)', background: 'var(--green-muted)' }
                            : { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }
                          }
                        >{v.signedIn ? 'Checked In' : 'Check In'}</button>
                      )}
                      {/* Cancel buttons */}
                      {privOnly && cancellingId === v.clientId ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>
                      ) : privOnly && (v.status === 'Cancelled' || v.status === 'LateCanceled') ? (
                        <button
                          onClick={e => handleCancel(e, v.clientId, false, true)}
                          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}
                        >Early</button>
                      ) : privOnly && (
                        <div className="flex gap-1">
                          <button
                            onClick={e => handleCancel(e, v.clientId, false)}
                            className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)' }}
                          >Early</button>
                          <button
                            onClick={e => handleCancel(e, v.clientId, true)}
                            className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                            style={{ color: 'var(--red)', background: 'var(--red-muted)' }}
                          >Late</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {bookingOpen && (
        <BookingModal
          classId={cls.classId}
          className={cls.className}
          startTime={cls.startTime}
          siteId={siteId}
          studioName={studioName}
          onClose={() => setBookingOpen(false)}
          onBooked={() => { setExpanded(true); fetchVisits() }}
        />
      )}
    </>
  )
}
