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
  const admin = await assertAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { group_id } = await req.json()
  if (!group_id) return NextResponse.json({ error: 'group_id required' }, { status: 400 })
  const { error } = await createAdminClient()
    .from('group_memberships')
    .insert({ group_id, user_id: admin.id, role: 'mod' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const groupId = req.nextUrl.searchParams.get('group_id')
  if (!groupId) return NextResponse.json({ error: 'group_id required' }, { status: 400 })
  const { data, error } = await createAdminClient()
    .from('group_memberships')
    .select('user_id, role, joined_at, profiles(display_name)')
    .eq('group_id', groupId)
    .order('joined_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { group_id, user_id, role } = await req.json()
  const { error } = await createAdminClient()
    .from('group_memberships')
    .update({ role })
    .eq('group_id', group_id)
    .eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { group_id, user_id } = await req.json()
  const { error } = await createAdminClient()
    .from('group_memberships')
    .delete()
    .eq('group_id', group_id)
    .eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
