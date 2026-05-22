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
  { href: '/prizes', label: 'Prizes' },
]

export default function Nav() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [groupName, setGroupName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMod, setIsMod] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile(userId: string) {
      const [{ data: membership }, { data: profile }] = await Promise.all([
        supabase
          .from('group_memberships')
          .select('role, groups(name)')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('profiles')
          .select('is_admin, is_global_mod')
          .eq('id', userId)
          .single(),
      ])
      const g = membership?.groups as unknown as { name: string } | null
      setGroupName(g?.name ?? null)
      setIsAdmin(!!profile?.is_admin)
      setIsMod(!!(profile?.is_global_mod || membership?.role === 'mod'))
    }

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        await loadProfile(data.user.id)
      } else {
        setGroupName(null)
        setIsAdmin(false)
        setIsMod(false)
      }
    }

    loadUser()

    // Re-fetch profile when auth state changes (e.g. after login)
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setGroupName(null)
        setIsAdmin(false)
        setIsMod(false)
      }
    })

    // Re-fetch profile when tab regains focus so role changes made by an admin
    // are reflected without requiring a full page reload
    function onVisible() {
      if (document.visibilityState === 'visible') loadUser()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navLinks = links.map((l) => (
    <Link
      key={l.href}
      href={l.href}
      className={`font-medium hover:text-[#f5c518] transition-colors ${pathname === l.href ? 'text-[#f5c518]' : ''}`}
    >
      {l.label}
    </Link>
  ))

  const authActions = user ? (
    <>
      <Link href="/dashboard" className="hover:text-[#f5c518] transition-colors">
        My Brackets
      </Link>
      {isMod && (
        <Link href="/mod" className={`hover:text-[#f5c518] transition-colors ${pathname === '/mod' ? 'text-[#f5c518]' : ''}`}>
          Mod
        </Link>
      )}
      {isAdmin && (
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
        className="bg-[#f5c518] text-black font-semibold px-3 py-1 rounded hover:bg-yellow-300 transition-colors"
      >
        Join the pool
      </Link>
    </>
  )

  return (
    <nav className="bg-[#cc0000] text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-bold text-lg tracking-tight shrink-0">
          MUNDIALITO <span className="text-[#f5c518]">2026</span>
        </Link>
        {groupName && (
          <span className="hidden sm:inline text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
            {groupName}
          </span>
        )}

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-4 flex-1 text-sm">
          {navLinks}
        </div>

        {/* Desktop auth actions */}
        <div className="hidden md:flex gap-3 items-center text-sm ml-auto">
          {authActions}
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

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-[#aa0000] px-4 py-4 flex flex-col gap-4 text-sm border-t border-white/20">
          {groupName && (
            <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full self-start">
              {groupName}
            </span>
          )}
          {navLinks}
          <div className="border-t border-white/20 pt-4 flex flex-col gap-4">
            {authActions}
          </div>
        </div>
      )}
    </nav>
  )
}
