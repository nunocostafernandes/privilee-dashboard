'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  classId: number
  className: string
  startTime: string
  siteId: string
  studioName: string
  onClose: () => void
  onBooked: () => void
}

interface ClientSuggestion {
  id: string
  firstName: string
  lastName: string
  email: string
  mobile: string
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function BookingModal({ classId, className, startTime, siteId, studioName, onClose, onBooked }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [mobile, setMobile]       = useState('')
  const [status, setStatus]       = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [bookedName, setBookedName] = useState('')

  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleEmailChange(value: string) {
    setEmail(value)
    setShowSuggestions(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clientsearch?q=${encodeURIComponent(value)}&siteId=${siteId}`)
        const data: ClientSuggestion[] = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      } catch { /* ignore */ }
    }, 300)
  }

  function selectSuggestion(c: ClientSuggestion) {
    setEmail(c.email)
    setFirstName(c.firstName)
    setLastName(c.lastName)
    setMobile(c.mobile)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, siteId, studioName, className, startTime, firstName, lastName, email, mobile }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')
      setBookedName(`${firstName} ${lastName}`.trim())
      setStatus('success')
      onBooked()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking failed')
      setStatus('error')
    }
  }

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-bold text-base">{className}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {studioName} &middot; {formatTime(startTime)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--green-muted)' }}
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--green)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-base">{bookedName}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Booked into {className}</p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="sara@example.com"
                autoComplete="off"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
              {showSuggestions && (
                <div
                  className="absolute z-10 w-full mt-1.5 rounded-xl overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                  }}
                >
                  {suggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectSuggestion(c)}
                      className="w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <span className="block text-sm font-medium">{c.firstName} {c.lastName}</span>
                      <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{c.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  First Name
                </label>
                <input
                  required
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Sara"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Last Name
                </label>
                <input
                  required
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Al Hashimi"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Mobile
              </label>
              <input
                required
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="+971 50 000 0000"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm focus:outline-none transition-colors"
                style={inputStyle}
              />
            </div>

            {status === 'error' && (
              <div
                className="px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2"
                style={{ background: 'var(--red-muted)', color: 'var(--red)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {status === 'loading' ? 'Booking...' : 'Book Class'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
