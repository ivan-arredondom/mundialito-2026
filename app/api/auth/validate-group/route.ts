import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Uses service role so RLS doesn't block the member count
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const { data: group } = await service
    .from('groups')
    .select('id, max_members')
    .eq('code', code.trim())
    .single()

  if (!group) return NextResponse.json({ error: 'Invalid group code. Check with your group admin.' }, { status: 400 })

  if (group.max_members !== null) {
    const { count } = await service
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    if (count !== null && count >= group.max_members) {
      return NextResponse.json({ error: 'This group is full. Contact your admin.' }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}
