import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ModClient from './mod-client'

interface Group {
  id: number
  name: string
  code: string
  max_brackets_per_user: number | null
  max_members: number | null
  entry_fee: number
  fee_per: 'person' | 'bracket'
  platform_fee_pct: number
  prize_splits: { place: number; pct: number }[]
}

export default async function ModPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_global_mod')
    .eq('id', user.id)
    .single()

  const isPrivileged = !!(profile?.is_admin || profile?.is_global_mod)

  let groups: Group[]

  if (isPrivileged) {
    const { data } = await createAdminClient()
      .from('groups')
      .select('id, name, code, max_brackets_per_user, max_members, entry_fee, fee_per, platform_fee_pct, prize_splits')
      .order('name')
    groups = (data ?? []) as Group[]
  } else {
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('role, groups(id, name, code, max_brackets_per_user, max_members, entry_fee, fee_per, platform_fee_pct, prize_splits)')
      .eq('user_id', user.id)
      .eq('role', 'mod')
    if (!memberships?.length) redirect('/')
    groups = memberships.map(m => m.groups as unknown as Group)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-black mb-1">Mod Panel</h1>
      <p className="text-gray-500 text-sm mb-8">Mundialito 2026 — moderator controls</p>
      <ModClient groups={groups} currentUserId={user.id} />
    </div>
  )
}
