import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Validate code
  const { data: group } = await service
    .from('groups')
    .select('id, max_members')
    .eq('code', code.trim())
    .single()

  if (!group) return NextResponse.json({ error: 'Invalid group code.' }, { status: 400 })

  // Check capacity
  if (group.max_members !== null) {
    const { count } = await service
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
    if (count !== null && count >= group.max_members) {
      return NextResponse.json({ error: 'This group is full.' }, { status: 400 })
    }
  }

  const { error } = await service
    .from('group_memberships')
    .insert({ group_id: group.id, user_id: user.id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
