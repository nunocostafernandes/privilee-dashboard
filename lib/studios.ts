export const STUDIOS = [
  { name: 'Alserkal Avenue', siteId: '564676' },
  { name: 'Town Square',     siteId: '5741777' },
  { name: 'Abu Dhabi',       siteId: '415190' },
] as const

export type Studio = typeof STUDIOS[number]

export const DEFAULT_STUDIO = STUDIOS[0]
