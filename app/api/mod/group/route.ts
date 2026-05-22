import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PrizeSplit = { place: number; pct: number }

async function assertGroupMod(groupId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('is_admin, is_global_mod').eq('id', user.id).single()
  if (profile?.is_admin || profile?.is_global_mod) return user
  const { data: membership } = await supabase
    .from('group_memberships').select('role').eq('group_id', groupId).eq('user_id', user.id).single()
  return membership?.role === 'mod' ? user : null
}

export async function PATCH(req: NextRequest) {
  const { group_id, entry_fee, fee_per, prize_splits } = await req.json()
  if (!await assertGroupMod(Number(group_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (fee_per !== undefined && fee_per !== 'person' && fee_per !== 'bracket') {
    return NextResponse.json({ error: 'fee_per must be "person" or "bracket"' }, { status: 400 })
  }

  if (prize_splits !== undefined) {
    const splits = prize_splits as PrizeSplit[]
    if (!Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json({ error: 'prize_splits must be a non-empty array' }, { status: 400 })
    }
    const total = splits.reduce((sum, s) => sum + s.pct, 0)
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json({ error: `Prize splits must total 100% (currently ${total}%)` }, { status: 400 })
    }
  }

  const updates: Record<string, unknown> = {}
  if (entry_fee !== undefined) updates.entry_fee = entry_fee
  if (fee_per !== undefined) updates.fee_per = fee_per
  if (prize_splits !== undefined) updates.prize_splits = prize_splits

  const { error } = await createAdminClient().from('groups').update(updates).eq('id', group_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
