'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

const links = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/results', label: 'Results' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export default function Nav() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null)
    )
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="bg-[#cc0000] text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
          MUNDIALITO <span className="text-[#f5c518]">2026</span>
        </Link>
        <div className="flex gap-4 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium hover:text-[#f5c518] transition-colors ${
                pathname === l.href ? 'text-[#f5c518]' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-3 items-center text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-[#f5c518] transition-colors">
                My Brackets
              </Link>
              <button onClick={signOut} className="hover:text-[#f5c518] transition-colors">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-[#f5c518] transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-[#f5c518] text-black font-semibold px-3 py-1 rounded hover:bg-yellow-300 transition-colors"
              >
                Join the pool
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
