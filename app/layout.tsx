import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: 'Privilee Dashboard',
  description: 'CRANK Privilee class booking management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){var t=localStorage.getItem('privilee-theme');if(t)document.documentElement.setAttribute('data-theme',t)})()
        `}} />
      </head>
      <body className={`${montserrat.variable} antialiased`}>{children}</body>
    </html>
  )
}
