import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchWC2026Teams, fetchWC2026Matches } from '@/lib/football-data'

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'GROUP',
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE: 'THIRD',
  FINAL: 'FINAL',
}

const KNOCKOUT_API_STAGES = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']

// R32 slot assignments — FIFA WC2026 bracket draw order (match_numbers 73–88 in kickoff_at order)
const R32_SLOTS: [string, string][] = [
  ['1A', '2D'], ['1B', '2C'], ['1E', '2F'], ['1F', '2E'],
  ['1C', '2B'], ['1D', '2A'], ['3rd-1', '3rd-2'], ['3rd-3', '3rd-4'],
  ['1G', '2J'], ['1H', '2K'], ['1K', '2H'], ['1L', '2I'],
  ['1I', '2L'], ['1J', '2G'], ['3rd-5', '3rd-6'], ['3rd-7', '3rd-8'],
]

// Feed chains: match_number → [feedA_matchNumber, feedB_matchNumber]
const FEED_CHAINS: Record<number, [number, number]> = {
  89: [73, 74], 90: [75, 76], 91: [77, 78], 92: [79, 80],
  93: [81, 82], 94: [83, 84], 95: [85, 86], 96: [87, 88],
  97: [89, 90], 98: [91, 92], 99: [93, 94], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  103: [101, 102],
  104: [101, 102],
}

// football-data.org TLA mismatches between teams and matches endpoints
const TLA_ALIASES: Record<string, string> = {
  CUR: 'CUW', // Curaçao
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

  // --- 1. Fetch from football-data.org ---
  const [apiTeams, apiMatches] = await Promise.all([
    fetchWC2026Teams(),
    fetchWC2026Matches(),
  ])

  // API returns "GROUP_A" — strip to single letter for our char(1) column
  const toGroupCode = (g: string | null) => g?.replace('GROUP_', '').slice(0, 1) ?? null

  // Resolve TLA alias (matches endpoint vs teams endpoint discrepancies)
  const resolveTla = (tla: string | undefined) =>
    tla ? (TLA_ALIASES[tla] ?? tla) : undefined

  // Derive each team's group code from the group stage matches
  const teamGroupMap = new Map<string, string>()
  for (const m of apiMatches) {
    if (m.stage === 'GROUP_STAGE' && m.group) {
      const code = toGroupCode(m.group)!
      const homeTla = resolveTla(m.homeTeam?.tla)
      const awayTla = resolveTla(m.awayTeam?.tla)
      if (homeTla) teamGroupMap.set(homeTla, code)
      if (awayTla) teamGroupMap.set(awayTla, code)
    }
  }

  // --- 2. Clear all dependent data and matches/teams ---
  await supabase.from('score_predictions').delete().gt('match_id', 0)
  await supabase.from('knockout_winner_picks').delete().gt('match_id', 0)
  await supabase.from('bracket_scores').delete().not('bracket_id', 'is', null)
  await supabase.from('matches').delete().eq('stage', 'GROUP')
  await supabase.from('matches').delete().neq('stage', 'GROUP') // knockout rows
  await supabase.from('teams').delete().gt('id', 0)

  // --- 3. Insert the 48 real qualified teams ---
  const { data: insertedTeams, error: teamsErr } = await supabase
    .from('teams')
    .insert(
      apiTeams.map(t => ({
        name: t.name,
        code: t.tla,
        group_code: teamGroupMap.get(t.tla) ?? null,
        flag_url: null,
      }))
    )
    .select()

  if (teamsErr) return NextResponse.json({ error: `teams: ${teamsErr.message}` }, { status: 500 })

  const teamIdByCode = new Map(insertedTeams!.map(t => [t.code, t.id]))

  // --- 4. Insert 72 group stage matches ---
  const groupApiMatches = apiMatches.filter(m => m.stage === 'GROUP_STAGE')

  const { data: insertedGroup, error: groupErr } = await supabase
    .from('matches')
    .insert(
      groupApiMatches.map(m => ({
        stage: 'GROUP',
        group_code: toGroupCode(m.group),
        home_team_id: teamIdByCode.get(resolveTla(m.homeTeam?.tla)!) ?? null,
        away_team_id: teamIdByCode.get(resolveTla(m.awayTeam?.tla)!) ?? null,
        kickoff_at: m.utcDate,
        external_id: String(m.id),
        status: 'SCHEDULED',
      }))
    )
    .select()

  if (groupErr) return NextResponse.json({ error: `group matches: ${groupErr.message}` }, { status: 500 })

  // Assign match_numbers 1–72 sorted by group_code then kickoff_at
  const sortedGroup = [...insertedGroup!].sort((a, b) => {
    const gc = (a.group_code ?? '').localeCompare(b.group_code ?? '')
    if (gc !== 0) return gc
    return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
  })

  await Promise.all(
    sortedGroup.map((m, i) =>
      supabase.from('matches').update({ match_number: i + 1 }).eq('id', m.id)
    )
  )

  // --- 5. Insert knockout matches in stage order, assign match_numbers 73–104 ---
  const matchNumberToId = new Map<number, number>() // match_number → db id
  let matchNumber = 73

  for (const apiStage of KNOCKOUT_API_STAGES) {
    const stageMatches = apiMatches
      .filter(m => m.stage === apiStage)
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

    for (const m of stageMatches) {
      const mn = matchNumber++
      const { data: inserted, error } = await supabase
        .from('matches')
        .insert({
          stage: STAGE_MAP[apiStage],
          kickoff_at: m.utcDate,
          external_id: String(m.id),
          match_number: mn,
          status: 'SCHEDULED',
        })
        .select('id')
        .single()

      if (error) return NextResponse.json({ error: `knockout ${apiStage}: ${error.message}` }, { status: 500 })
      matchNumberToId.set(mn, inserted.id)
    }
  }

  // --- 6. Set R32 slot assignments ---
  await Promise.all(
    R32_SLOTS.map(([slot_a, slot_b], i) => {
      const mn = 73 + i
      const dbId = matchNumberToId.get(mn)
      if (!dbId) return Promise.resolve()
      return supabase.from('matches').update({ slot_a, slot_b }).eq('id', dbId)
    })
  )

  // --- 7. Set feed chains for R16, QF, SF, THIRD, FINAL ---
  await Promise.all(
    Object.entries(FEED_CHAINS).map(([mn, [feedA, feedB]]) => {
      const dbId = matchNumberToId.get(Number(mn))
      const feedAId = matchNumberToId.get(feedA)
      const feedBId = matchNumberToId.get(feedB)
      if (!dbId || !feedAId || !feedBId) return Promise.resolve()
      return supabase
        .from('matches')
        .update({ feed_a_match_id: feedAId, feed_b_match_id: feedBId })
        .eq('id', dbId)
    })
  )

  return NextResponse.json({
    teams: insertedTeams!.length,
    groupMatches: insertedGroup!.length,
    knockoutMatches: matchNumber - 73,
  })
}
