import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? user : null
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, code } = await req.json()
  if (!name || !code) return NextResponse.json({ error: 'name and code required' }, { status: 400 })
  const { data, error } = await createAdminClient()
    .from('groups')
    .insert({ name, code: code.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, max_brackets_per_user, max_members, platform_fee_pct, show_in_global } = await req.json()

  if (max_members != null) {
    const { count } = await createAdminClient()
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id)
    if (count !== null && max_members < count) {
      return NextResponse.json(
        { error: `Group already has ${count} member${count !== 1 ? 's' : ''} — limit must be ≥ ${count}` },
        { status: 400 }
      )
    }
  }

  if (platform_fee_pct !== undefined && (platform_fee_pct < 0 || platform_fee_pct > 10)) {
    return NextResponse.json({ error: 'Platform fee must be between 0% and 10%' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (max_brackets_per_user !== undefined) updates.max_brackets_per_user = max_brackets_per_user
  if (max_members !== undefined) updates.max_members = max_members
  if (platform_fee_pct !== undefined) updates.platform_fee_pct = platform_fee_pct
  if (show_in_global !== undefined) updates.show_in_global = show_in_global

  const { error } = await createAdminClient().from('groups').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  const { error } = await createAdminClient().from('groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
