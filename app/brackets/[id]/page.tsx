import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isLocked } from '@/lib/lock'
import { requireGroup } from '@/lib/require-group'
import BracketEditor from './bracket-editor'
import type { KnockoutMatch } from '@/lib/standings'

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireGroup()
  const supabase = await createClient()

  const { data: bracket } = await supabase
    .from('brackets')
    .select('id, name, user_id')
    .eq('id', id)
    .single()

  if (!bracket) notFound()

  const isOwner = bracket.user_id === user.id
  const locked = isLocked()
  const canEdit = isOwner && !locked

  // Group-stage matches with team info
  const { data: groupMatchesRaw } = await supabase
    .from('matches')
    .select(`
      id, group_code, kickoff_at, home_score, away_score, status,
      home_team:teams!matches_home_team_id_fkey(id, code, name, flag_url),
      away_team:teams!matches_away_team_id_fkey(id, code, name, flag_url)
    `)
    .eq('stage', 'GROUP')
    .order('kickoff_at', { ascending: true })

  // Knockout matches with bracket connectivity columns
  const { data: knockoutMatchesRaw } = await supabase
    .from('matches')
    .select('id, match_number, stage, slot_a, slot_b, feed_a_match_id, feed_b_match_id, kickoff_at')
    .neq('stage', 'GROUP')
    .order('match_number', { ascending: true })

  // Score predictions for this bracket
  const { data: scorePredRows } = await supabase
    .from('score_predictions')
    .select('match_id, home_score, away_score')
    .eq('bracket_id', id)

  // Knockout winner picks for this bracket
  const { data: winnerPickRows } = await supabase
    .from('knockout_winner_picks')
    .select('match_id, winner_team_id')
    .eq('bracket_id', id)

  // All teams for knockout team resolution
  const { data: teamsRaw } = await supabase
    .from('teams')
    .select('id, code, name, flag_url')
    .order('id', { ascending: true })

  const groupMatches = (groupMatchesRaw ?? []) as unknown as Array<{
    id: number
    group_code: string
    kickoff_at: string
    home_score: number | null
    away_score: number | null
    status: string
    home_team: { id: number; code: string; name: string; flag_url: string | null }
    away_team: { id: number; code: string; name: string; flag_url: string | null }
  }>

  const knockoutMatches: KnockoutMatch[] = (knockoutMatchesRaw ?? []).map(m => ({
    id: m.id,
    match_number: m.match_number,
    stage: m.stage,
    slot_a: m.slot_a,
    slot_b: m.slot_b,
    feed_a_match_id: m.feed_a_match_id,
    feed_b_match_id: m.feed_b_match_id,
    kickoff_at: m.kickoff_at,
  }))

  const initialScorePreds = (scorePredRows ?? []).map(r => ({
    match_id: r.match_id,
    home_score: r.home_score,
    away_score: r.away_score,
  }))

  const initialWinnerPicks: Record<number, number> = {}
  for (const r of winnerPickRows ?? []) {
    initialWinnerPicks[r.match_id] = r.winner_team_id
  }

  const teams = (teamsRaw ?? []) as Array<{
    id: number
    code: string
    name: string
    flag_url: string | null
  }>

  return (
    <BracketEditor
      bracketName={bracket.name}
      bracketId={id}
      groupMatches={groupMatches}
      knockoutMatches={knockoutMatches}
      teams={teams}
      initialScorePreds={initialScorePreds}
      initialWinnerPicks={initialWinnerPicks}
      canEdit={canEdit}
    />
  )
}
