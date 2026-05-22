import { createClient } from '@/lib/supabase/server'

interface ResultMatch {
  id: number
  stage: string
  group_code: string | null
  kickoff_at: string
  home_score: number | null
  away_score: number | null
  home_team: { code: string; name: string } | null
  away_team: { code: string; name: string } | null
}

export default async function ResultsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(`
      id, stage, group_code, kickoff_at, home_score, away_score,
      home_team:teams!matches_home_team_id_fkey(code, name),
      away_team:teams!matches_away_team_id_fkey(code, name)
    `)
    .eq('status', 'FINISHED')
    .order('kickoff_at', { ascending: false })

  const matches = (data ?? []) as unknown as ResultMatch[]

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black mb-8">Results</h1>
      {!matches.length ? (
        <p className="text-gray-400 text-center py-20">
          No results yet — tournament starts June 11, 2026.
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-3 border-b border-gray-100 text-sm"
            >
              <span className="text-gray-400 text-xs w-28 shrink-0">
                {new Date(m.kickoff_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="flex-1 text-right font-semibold">{m.home_team?.name ?? 'TBD'}</span>
              <span className="font-black text-lg tabular-nums shrink-0 w-16 text-center">
                {m.home_score} – {m.away_score}
              </span>
              <span className="flex-1 font-semibold">{m.away_team?.name ?? 'TBD'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
