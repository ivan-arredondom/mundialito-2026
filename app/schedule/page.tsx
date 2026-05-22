import { createClient } from '@/lib/supabase/server'
import LocalTime from '@/components/local-time'

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Group Stage',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  THIRD: '3rd Place',
  FINAL: 'Final',
}

interface MatchRow {
  id: number
  stage: string
  group_code: string | null
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team: { code: string; name: string } | null
  away_team: { code: string; name: string } | null
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(`
      id, stage, group_code, kickoff_at, status, home_score, away_score,
      home_team:teams!matches_home_team_id_fkey(code, name),
      away_team:teams!matches_away_team_id_fkey(code, name)
    `)
    .order('kickoff_at', { ascending: true })

  const matches = (data ?? []) as unknown as MatchRow[]

  const byStage = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    ;(acc[m.stage] ??= []).push(m)
    return acc
  }, {})

  const stageOrder = ['GROUP', 'R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-black mb-8 md:mb-10">Schedule</h1>
      {stageOrder.map((stage) => {
        const stageMatches = byStage[stage]
        if (!stageMatches?.length) return null
        return (
          <section key={stage} className="mb-10">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
              {STAGE_LABELS[stage]}
            </h2>
            <div className="space-y-2">
              {stageMatches.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MatchRow({ m }: { m: MatchRow }) {
  const badge = (
    <span
      className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
        m.status === 'FINISHED'
          ? 'bg-gray-100 text-gray-500'
          : m.status === 'IN_PLAY'
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-50 text-blue-500'
      }`}
    >
      {m.status === 'FINISHED' ? 'FT' : m.status === 'IN_PLAY' ? 'LIVE' : 'Sched.'}
    </span>
  )
  return (
    <div className="py-2 border-b border-gray-50 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right font-medium truncate">{m.home_team?.name ?? 'TBD'}</span>
        <span className="text-gray-700 font-bold shrink-0 w-12 text-center text-xs">
          {m.status === 'FINISHED' ? `${m.home_score}–${m.away_score}` : 'vs'}
        </span>
        <span className="flex-1 font-medium truncate">{m.away_team?.name ?? 'TBD'}</span>
        {badge}
      </div>
      <p className="text-gray-400 text-xs mt-0.5 text-center">
        <LocalTime utc={m.kickoff_at} />
      </p>
    </div>
  )
}
