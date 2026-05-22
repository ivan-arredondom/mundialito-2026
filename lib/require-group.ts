import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireGroup() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('group_memberships')
    .select('group_id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/join-group')
  return user
}
