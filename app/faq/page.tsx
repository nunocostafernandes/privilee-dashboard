'use client'
import ThemeToggle from '@/components/ThemeToggle'

export default function FaqPage() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; font-family: 'Montserrat', sans-serif; }
          .print-page { background: #fff !important; color: #111 !important; max-width: 100% !important; padding: 0 !important; }
          .print-card { background: #f8f8f8 !important; border: 1px solid #e0e0e0 !important; break-inside: avoid; }
          .print-accent { color: #d4580a !important; }
          .print-muted { color: #555 !important; }
          .print-divider { border-color: #ddd !important; }
          .faq-tag-booking { background: #d4edda !important; color: #1a6630 !important; }
          .faq-tag-early { background: #ffe5cc !important; color: #b34d00 !important; }
          .faq-tag-late { background: #fde0e0 !important; color: #b30000 !important; }
          a { color: #d4580a !important; }
        }
      `}</style>

      <div className="min-h-screen print-page" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-montserrat), sans-serif' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px' }}>
            <div className="no-print" style={{ marginBottom: '24px' }}>
              <a href="/" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Back to Dashboard
              </a>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  CRANK Internal Guide
                </p>
                <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
                  Privilee Dashboard
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  How to use it · Staff reference
                </p>
              </div>
              <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ThemeToggle />
              <button
                onClick={() => window.print()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Save as PDF
              </button>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: '13px' }}>
              Access the dashboard at{' '}
              <a href="https://privilee.aitaskforce.pro" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                privilee.aitaskforce.pro
              </a>
            </div>
          </div>

          {/* Section: What is this */}
          <Section title="What is this?" accent>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-muted)', margin: 0 }}>
              The Privilee Dashboard is your tool for managing Privilee client bookings across all three CRANK studios.
              It connects directly to Mindbody — everything you do here is reflected in real time. No double-entry needed.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '16px' }}>
              {[
                'See today\'s classes and who\'s booked',
                'Book a Privilee client into a class',
                'Cancel a booking (early or late)',
                'Check full booking history',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '16px' }}>·</span>
                  {item}
                </div>
              ))}
            </div>
          </Section>

          {/* Section: Viewing Classes */}
          <Section title="Viewing Classes">
            <Steps items={[
              { label: 'Select your studio', body: 'Tap the studio name at the top — Alserkal Avenue, Town Square, or Abu Dhabi. The large name in the header always confirms which studio you\'re on. Always double-check before booking.' },
              { label: 'Pick a date', body: 'Use the date strip below the studio selector to jump between days.' },
              { label: 'Expand a class', body: 'Tap any class row to see the full roster — client names, service used, and booking status.' },
              { label: 'Turn on Privilee Only', body: 'Toggle "Privilee Only" (top right, above the class list) to filter down to Privilee bookings. This is the view you\'ll use most.' },
            ]} />
          </Section>

          {/* Section: Booking */}
          <Section title="Booking a Privilee Client">
            <Steps items={[
              { label: 'Find the class', body: 'Navigate to the correct studio, date, and class.' },
              { label: 'Tap the + button', body: 'It appears on the right side of the class row. It only shows for upcoming classes.' },
              { label: 'Fill in the client details', body: 'Start typing their email address — if they\'re already in Mindbody, their name and mobile will fill in automatically. If they\'re new, fill in all fields.' },
              { label: 'Tap Book Class', body: 'The dashboard finds or creates the client, adds their Privilee session credit, books them into the class, and logs everything in history — all at once.' },
            ]} />
          </Section>

          {/* Section: Cancelling */}
          <Section title="Cancelling a Booking">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              With <strong style={{ color: 'var(--text)' }}>Privilee Only</strong> turned on, expand a class to see the roster.
              Each Privilee client will have two cancel buttons: <strong style={{ color: 'var(--text)' }}>Early</strong> and <strong style={{ color: 'var(--text)' }}>Late</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <CancelCard
                type="Early Cancel"
                color="#f97316"
                bg="rgba(249,115,22,0.08)"
                tagClass="faq-tag-early"
                when="Client cancels with enough notice (before the late cancel window)"
                what={['Removes them from the class', 'Voids their Privilee credit — it cannot be reused']}
                note="The credit is consumed regardless. This is intentional — it prevents abuse."
              />
              <CancelCard
                type="Late Cancel"
                color="#ef4444"
                bg="rgba(239,68,68,0.08)"
                tagClass="faq-tag-late"
                when="Last-minute cancellation or no-show"
                what={['Removes them from the class', 'The Privilee credit is not voided — the late cancel penalty applies per studio policy']}
                note={null}
              />
            </div>

            <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text)' }}>Not sure which to use?</strong> If the client is giving plenty of notice, use Early. If it&apos;s last-minute or a no-show, use Late.
            </div>
          </Section>

          {/* Section: History */}
          <Section title="Booking History">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Tap <strong style={{ color: 'var(--text)' }}>History</strong> in the top right corner to see a full log of all bookings and cancellations across all studios.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Entry type', body: 'Each card is clearly labelled — Booking, Early Cancel, or Late Cancel — with a colour strip at the top.' },
                { label: 'Client & class', body: 'Name, email, class name, studio, and date are shown on every entry.' },
                { label: 'Notes', body: 'Tap the notes area at the bottom of any card to add context. Notes are saved permanently and exported to CSV.' },
                { label: 'Filter & search', body: 'Filter by studio or search by client name, email, or class.' },
                { label: 'Download CSV', body: 'Tap the CSV button to export the full list — useful for monthly Privilee reconciliation.' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', minWidth: '110px', flexShrink: 0 }}>{item.label}</span>
                  <span style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.body}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Section: FAQ */}
          <Section title="FAQ">
            {[
              { q: 'What if the client already exists in Mindbody?', a: 'The dashboard finds them automatically when you type their email. Their name and mobile fill in — you just confirm and book.' },
              { q: 'What if I book into the wrong studio?', a: 'Always check the studio name at the top of the page before tapping Book Class. If it\'s wrong, contact Nuno to fix it manually in Mindbody.' },
              { q: 'Can I book into a past class?', a: 'No — the + button only appears on upcoming classes. Past classes are greyed out and read-only.' },
              { q: 'The booking failed — what do I do?', a: 'An error message will appear explaining what went wrong. Try again once. If it keeps failing, note the error and contact Nuno.' },
              { q: 'What\'s the difference between early and late cancel for the client?', a: 'Early cancel voids their Privilee credit so it can\'t be reused. Late cancel keeps the credit voided via the late-cancel penalty — either way the session is consumed.' },
              { q: 'Can I undo a cancellation?', a: 'Not through the dashboard — you\'ll need to rebook them manually. Use the booking form to book them back in if needed.' },
            ].map(item => (
              <div key={item.q} style={{ marginBottom: '12px', padding: '14px 16px', borderRadius: '10px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>
                  {item.q}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </Section>

          {/* Footer */}
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>CRANK Internal — Not for external distribution</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Questions? Contact Nuno.</p>
          </div>

        </div>
      </div>
    </>
  )
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {accent && <span style={{ display: 'block', width: '3px', height: '20px', borderRadius: '2px', background: 'var(--accent)', flexShrink: 0 }} />}
        <h2 style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>{title}</h2>
        {!accent && <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />}
      </div>
      {children}
    </div>
  )
}

function Steps({ items }: { items: { label: string; body: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px 16px', borderRadius: '10px', background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {i + 1}
          </span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 3px', color: 'var(--text)' }}>{item.label}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function CancelCard({ type, color, bg, when, what, note }: {
  type: string; color: string; bg: string; tagClass: string;
  when: string; what: string[]; note: string | null
}) {
  return (
    <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}` }}>
      <div style={{ padding: '8px 16px', background: bg, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>{type}</span>
      </div>
      <div style={{ padding: '12px 16px', background: 'var(--card)' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>When to use</p>
        <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '12px', lineHeight: 1.5 }}>{when}</p>
        <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px' }}>What happens</p>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          {what.map(w => <li key={w} style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{w}</li>)}
        </ul>
        {note && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', marginBottom: 0, padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${color}`, lineHeight: 1.5 }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
