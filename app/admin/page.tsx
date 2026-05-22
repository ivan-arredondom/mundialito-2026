import { requireAdmin } from '@/lib/require-role'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './admin-client'

export default async function AdminPage() {
  const user = await requireAdmin()

  const supabase = await createClient()

  const [{ data: settings }, { data: groups }] = await Promise.all([
    supabase.from('app_settings').select('*').single(),
    supabase.from('groups').select('id, name, code, max_brackets_per_user, max_members, platform_fee_pct').order('created_at'),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black mb-1">Admin Panel</h1>
      <p className="text-gray-500 text-sm mb-10">Mundialito 2026 — superadmin controls</p>
      <AdminClient
        initialSettings={settings ?? { allow_registrations: true, max_brackets_per_user: 3 }}
        initialGroups={groups ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
