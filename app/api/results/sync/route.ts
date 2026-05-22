import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchWC2026Matches } from '@/lib/football-data'

const STAGE_MAP: Record<string, string> = {
  'GROUP_STAGE': 'GROUP',
  'LAST_32': 'R32',
  'LAST_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': 'THIRD',
  'FINAL': 'FINAL',
}
const STATUS_MAP: Record<string, string> = {
  'SCHEDULED': 'SCHEDULED',
  'TIMED': 'SCHEDULED',
  'IN_PLAY': 'IN_PLAY',
  'PAUSED': 'IN_PLAY',
  'FINISHED': 'FINISHED',
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sync-secret')
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const matches = await fetchWC2026Matches()
  let updated = 0

  for (const m of matches) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) continue

    const status = STATUS_MAP[m.status] ?? 'SCHEDULED'
    const homeScore = m.score.fullTime.home
    const awayScore = m.score.fullTime.away

    // Resolve team ids by code
    const homeCode = m.homeTeam.tla
    const awayCode = m.awayTeam.tla

    const { data: homeTeam } = await supabase
      .from('teams').select('id').eq('code', homeCode).single()
    const { data: awayTeam } = await supabase
      .from('teams').select('id').eq('code', awayCode).single()

    const { error } = await supabase.from('matches').upsert({
      external_id: String(m.id),
      stage,
      group_code: m.group ?? null,
      home_team_id: homeTeam?.id ?? null,
      away_team_id: awayTeam?.id ?? null,
      kickoff_at: m.utcDate,
      home_score: status === 'FINISHED' ? homeScore : null,
      away_score: status === 'FINISHED' ? awayScore : null,
      status,
    }, { onConflict: 'external_id' })

    if (!error) updated++
  }

  return NextResponse.json({ updated })
}
