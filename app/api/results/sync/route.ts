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
  let skipped = 0

  for (const m of matches) {
    const stage = STAGE_MAP[m.stage]
    if (!stage) { skipped++; continue }

    const status = STATUS_MAP[m.status] ?? 'SCHEDULED'
    const homeScore = m.score.fullTime.home
    const awayScore = m.score.fullTime.away
    const homeCode = m.homeTeam.tla
    const awayCode = m.awayTeam.tla

    const [{ data: homeTeam }, { data: awayTeam }] = await Promise.all([
      supabase.from('teams').select('id').eq('code', homeCode).single(),
      supabase.from('teams').select('id').eq('code', awayCode).single(),
    ])

    const payload = {
      external_id: String(m.id),
      stage,
      group_code: m.group ?? null,
      home_team_id: homeTeam?.id ?? null,
      away_team_id: awayTeam?.id ?? null,
      kickoff_at: m.utcDate,
      home_score: status === 'FINISHED' ? homeScore : null,
      away_score: status === 'FINISHED' ? awayScore : null,
      status,
    }

    // For group stage: match existing seeded row by team IDs so we update
    // the placeholder instead of inserting a duplicate.
    if (stage === 'GROUP' && homeTeam?.id && awayTeam?.id) {
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('home_team_id', homeTeam.id)
        .eq('away_team_id', awayTeam.id)
        .eq('stage', 'GROUP')
        .is('external_id', null)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', existing.id)
        if (!error) updated++
        continue
      }
    }

    // Knockout matches (teams TBD) or group matches already stamped: upsert by external_id
    const { error } = await supabase
      .from('matches')
      .upsert(payload, { onConflict: 'external_id' })
    if (!error) updated++
  }

  return NextResponse.json({ updated, skipped, total: matches.length })
}
