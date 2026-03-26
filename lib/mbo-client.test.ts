import { mapClass, mapVisit } from './mbo-client'

describe('mapClass', () => {
  it('maps MBO class fields to internal shape', () => {
    const raw = {
      Id: 123,
      ClassDescription: { Name: 'RIDE 45' },
      StartDateTime: '2026-03-26T06:00:00',
      EndDateTime:   '2026-03-26T06:45:00',
      TotalBooked: 12,
      MaxCapacity: 14,
      TotalBookedWaitlist: 2,
    }
    expect(mapClass(raw)).toEqual({
      classId: 123,
      className: 'RIDE 45',
      startTime: '2026-03-26T06:00:00',
      endTime:   '2026-03-26T06:45:00',
      totalBooked: 12,
      maxCapacity: 14,
      waitlistCount: 2,
    })
  })
})

describe('mapVisit', () => {
  it('formats name and maps status', () => {
    const raw = {
      Client: { FirstName: 'Sarah', LastName: 'Mitchell' },
      AppointmentStatus: 'Confirmed',
    }
    expect(mapVisit(raw)).toEqual({ name: 'Sarah M.', status: 'Confirmed' })
  })

  it('defaults null status to Unknown', () => {
    const raw = { Client: { FirstName: 'James', LastName: 'K' }, AppointmentStatus: null }
    expect(mapVisit(raw)).toEqual({ name: 'James K.', status: 'Unknown' })
  })
})
