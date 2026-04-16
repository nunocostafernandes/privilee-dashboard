'use client'
import ReportsView from '@/components/ReportsView'
import ThemeToggle from '@/components/ThemeToggle'

export default function ReportsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
        <header className="mb-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--card)]"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </a>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
                style={{ color: 'var(--accent)' }}
              >
                Privilee Dashboard
              </p>
              <h1 className="text-xl font-bold tracking-tight leading-none">Reports</h1>
            </div>
          </div>
          <ThemeToggle />
          </div>
        </header>

        <ReportsView />
      </div>
    </div>
  )
}
