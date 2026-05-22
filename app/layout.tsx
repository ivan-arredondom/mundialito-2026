import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Mundialito 2026',
  description: 'FIFA World Cup 2026 Prediction Pool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 font-sans antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="text-center text-xs text-gray-400 py-6">
          © Mundialito ._.
        </footer>
      </body>
    </html>
  )
}
