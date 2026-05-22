import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertGroupMod(groupId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('is_admin, is_global_mod').eq('id', user.id).single()
  if (profile?.is_admin || profile?.is_global_mod) return user

  const { data: membership } = await supabase
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  return membership?.role === 'mod' ? user : null
}

export async function GET(req: NextRequest) {
  const groupId = Number(req.nextUrl.searchParams.get('group_id'))
  if (!groupId) return NextResponse.json({ error: 'group_id required' }, { status: 400 })
  if (!await assertGroupMod(groupId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await createAdminClient()
    .from('group_memberships')
    .select('user_id, role, paid, joined_at, profiles(display_name)')
    .eq('group_id', groupId)
    .order('joined_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { group_id, user_id, role, paid } = await req.json()
  if (!await assertGroupMod(Number(group_id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const patch: Record<string, unknown> = {}
  if (role !== undefined) patch.role = role
  if (paid !== undefined) patch.paid = paid

  const { error } = await createAdminClient()
    .from('group_memberships')
    .update(patch)
    .eq('group_id', group_id)
    .eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { group_id, user_id } = await req.json()
  if (!await assertGroupMod(Number(group_id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await createAdminClient()
    .from('group_memberships')
    .delete()
    .eq('group_id', group_id)
    .eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
