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

export async function requireMod() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from('profiles').select('is_admin, is_global_mod').eq('id', user.id).single(),
    supabase.from('group_memberships').select('role').eq('user_id', user.id).eq('role', 'mod').maybeSingle(),
  ])

  if (!profile?.is_admin && !profile?.is_global_mod && !membership) redirect('/')
  return user
}
