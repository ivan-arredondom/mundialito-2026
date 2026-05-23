import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Nav from '@/components/nav'
import BottomNav from '@/components/bottom-nav'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Mundialito 2026',
  description: 'FIFA World Cup 2026 Prediction Pool',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mundialito',
  },
}

export const viewport: Viewport = {
  themeColor: '#cc0000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 font-sans antialiased">
        <Nav />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <footer className="hidden md:block text-center text-xs text-gray-400 py-6">
          © Mundialito ._.
        </footer>
        <BottomNav />
      </body>
    </html>
  )
}
