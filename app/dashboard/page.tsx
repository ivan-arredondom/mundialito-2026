import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isLocked } from '@/lib/lock'
import SubmissionsClient from './submissions-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [bracketsRes, leaderboardRes] = await Promise.all([
    supabase
      .from('brackets')
      .select(`
        id, name,
        bracket_scores(points),
        score_predictions(match_id),
        knockout_winner_picks(match_id)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('leaderboard')
      .select('bracket_id, rank'),
  ])

  const rankByBracket: Record<string, number> = {}
  for (const row of leaderboardRes.data ?? []) {
    rankByBracket[row.bracket_id] = row.rank
  }

  const brackets = (bracketsRes.data ?? []).map(b => {
    const scores = b.bracket_scores as { points: number }[] | null
    const scorePreds = b.score_predictions as { match_id: number }[] | null
    const koPicks = b.knockout_winner_picks as { match_id: number }[] | null
    return {
      id: b.id,
      name: b.name,
      points: scores?.[0]?.points ?? 0,
      rank: rankByBracket[b.id] ?? null,
      groupPicks: scorePreds?.length ?? 0,
      koPicks: koPicks?.length ?? 0,
    }
  })

  return (
    <SubmissionsClient
      initialBrackets={brackets}
      locked={isLocked()}
    />
  )
}
