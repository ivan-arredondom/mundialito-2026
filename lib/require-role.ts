import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type Profile = { is_admin: boolean; is_global_mod: boolean } | null

async function requireRole(check: (p: Profile) => boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_global_mod')
    .eq('id', user.id)
    .single()
  if (!check(profile)) redirect('/')
  return user
}

export function requireAdmin() {
  return requireRole(p => !!p?.is_admin)
}

export function requireMod() {
  return requireRole(p => !!(p?.is_admin || p?.is_global_mod))
}
