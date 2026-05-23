'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import InstallGuide from './install-guide'

const tabs = [
  {
    href: '/schedule',
    label: 'Schedule',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.75} />
        <path d="M16 2v4M8 2v4M3 10h18" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M8 17H5a2 2 0 0 0-2 2v1h18v-1a2 2 0 0 0-2-2h-3" strokeWidth={1.75} strokeLinecap="round" />
        <path d="M12 3v10m0 0a4 4 0 0 0 4-4V5H8v4a4 4 0 0 0 4 4z" strokeWidth={1.75} strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'My Brackets',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h10M4 18h6" strokeWidth={1.75} strokeLinecap="round" />
        <path d="M17 12l3 3-3 3" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/prizes',
    label: 'Prizes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l2.4 4.8 5.3.8-3.85 3.75.91 5.3L12 14.1l-4.76 2.55.91-5.3L4.3 7.6l5.3-.8L12 2z" strokeWidth={1.75} strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const visibleTabs = loggedIn ? tabs : tabs.filter(t => t.href !== '/dashboard')

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
      <div className="flex">
        <InstallGuide />
        {visibleTabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-[#cc0000]' : 'text-gray-400'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
