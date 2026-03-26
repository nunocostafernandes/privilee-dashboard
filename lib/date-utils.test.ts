import { getDateStrip, formatDateLabel, toDateString } from './date-utils'

describe('getDateStrip', () => {
  it('returns 6 dates starting from today', () => {
    const today = new Date(2026, 2, 26)
    const strip = getDateStrip(today)
    expect(strip).toHaveLength(6)
    expect(toDateString(strip[0])).toBe('2026-03-26')
    expect(toDateString(strip[5])).toBe('2026-03-31')
  })
})

describe('formatDateLabel', () => {
  it('labels the first date as "Today"', () => {
    const today = new Date(2026, 2, 26)
    expect(formatDateLabel(today, today)).toBe('Today')
  })

  it('formats other dates as "Fri 27"', () => {
    const today    = new Date(2026, 2, 26)
    const tomorrow = new Date(2026, 2, 27)
    expect(formatDateLabel(tomorrow, today)).toBe('Fri 27')
  })

  it('adds month name on first day of a new month', () => {
    const today  = new Date(2026, 2, 29)
    const april1 = new Date(2026, 3, 1)
    expect(formatDateLabel(april1, today)).toBe('Wed 1 Apr')
  })

  it('does not add month name on non-boundary dates', () => {
    const today  = new Date(2026, 2, 29)
    const april2 = new Date(2026, 3, 2)
    expect(formatDateLabel(april2, today)).toBe('Thu 2')
  })
})
