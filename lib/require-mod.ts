import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireMod() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, is_global_mod')
    .eq('id', user.id)
    .single()

  if (!profile?.is_global_mod && !profile?.is_admin) redirect('/')
  return user
}
