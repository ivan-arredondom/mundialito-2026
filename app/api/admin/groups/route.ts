import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
  const { data, error } = await serviceClient()
    .from('groups')
    .insert({ name, code: code.trim() })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, max_brackets_per_user, max_members } = await req.json()

  if (max_members !== null && max_members !== undefined) {
    const { count } = await serviceClient()
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

  const updates: Record<string, number | null> = {}
  if (max_brackets_per_user !== undefined) updates.max_brackets_per_user = max_brackets_per_user
  if (max_members !== undefined) updates.max_members = max_members

  const { error } = await serviceClient().from('groups').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  const { error } = await serviceClient().from('groups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
