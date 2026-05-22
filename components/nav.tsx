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
  const [groupName, setGroupName] = useState<string | null>(null)
  const [isPrivileged, setIsPrivileged] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        const [{ data: membership }, { data: profile }] = await Promise.all([
          supabase
            .from('group_memberships')
            .select('groups(name)')
            .eq('user_id', data.user.id)
            .single(),
          supabase
            .from('profiles')
            .select('is_admin, is_global_mod')
            .eq('id', data.user.id)
            .single(),
        ])
        const g = membership?.groups as unknown as { name: string } | null
        setGroupName(g?.name ?? null)
        setIsPrivileged(!!(profile?.is_admin || profile?.is_global_mod))
      } else {
        setGroupName(null)
        setIsPrivileged(false)
      }
    }

    loadUser()

    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) { setGroupName(null); setIsPrivileged(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="bg-[#cc0000] text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
          MUNDIALITO <span className="text-[#f5c518]">2026</span>
        </Link>
        {groupName && (
          <span className="hidden sm:inline text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full shrink-0">
            {groupName}
          </span>
        )}

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-4 flex-1">
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

        {/* Desktop right side */}
        <div className="hidden md:flex gap-3 items-center text-sm ml-auto">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-[#f5c518] transition-colors">
                My Brackets
              </Link>
              {isPrivileged && (
                <Link href="/admin" className={`hover:text-[#f5c518] transition-colors ${pathname === '/admin' ? 'text-[#f5c518]' : ''}`}>
                  Admin
                </Link>
              )}
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

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-1 hover:text-[#f5c518] transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#aa0000] px-4 py-4 flex flex-col gap-4 text-sm border-t border-white/20">
          {groupName && (
            <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full self-start">
              {groupName}
            </span>
          )}
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-medium hover:text-[#f5c518] transition-colors ${
                pathname === l.href ? 'text-[#f5c518]' : ''
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-white/20 pt-4 flex flex-col gap-4">
            {user ? (
              <>
                <Link href="/dashboard" className="hover:text-[#f5c518] transition-colors">
                  My Brackets
                </Link>
                {isPrivileged && (
                  <Link href="/admin" className={`hover:text-[#f5c518] transition-colors ${pathname === '/admin' ? 'text-[#f5c518]' : ''}`}>
                    Admin
                  </Link>
                )}
                <button onClick={signOut} className="text-left hover:text-[#f5c518] transition-colors">
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
                  className="bg-[#f5c518] text-black font-semibold px-4 py-2 rounded text-center hover:bg-yellow-300 transition-colors"
                >
                  Join the pool
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
