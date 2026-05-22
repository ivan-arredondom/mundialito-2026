import { createClient } from '@/lib/supabase/server'
import { flagSrc } from '@/lib/flags'
import LocalTime from '@/components/local-time'
import Link from 'next/link'

const STAGE_LABELS: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarterfinals',
  SF: 'Semifinals',
  THIRD: '3rd Place',
  FINAL: 'Final',
}

const KO_STAGES = ['R32', 'R16', 'QF', 'SF', 'THIRD', 'FINAL']

interface MatchRow {
  id: number
  stage: string
  group_code: string | null
  match_number: number
  kickoff_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team: { code: string; name: string } | null
  away_team: { code: string; name: string } | null
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'knockout' ? 'knockout' : 'group'

  const supabase = await createClient()
  const { data } = await supabase
    .from('matches')
    .select(`
      id, stage, group_code, match_number, kickoff_at, status, home_score, away_score,
      home_team:teams!matches_home_team_id_fkey(code, name),
      away_team:teams!matches_away_team_id_fkey(code, name)
    `)
    .order('match_number', { ascending: true })

  const matches = (data ?? []) as unknown as MatchRow[]
  const groupMatches = matches.filter(m => m.stage === 'GROUP')
  const knockoutMatches = matches.filter(m => m.stage !== 'GROUP')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-black mb-6">Schedule</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-200">
        <Link
          href="/schedule"
          className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'group'
              ? 'border-[#cc0000] text-[#cc0000]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Group Stage
          <span className="ml-1.5 text-[10px] font-normal text-gray-400">72 matches</span>
        </Link>
        <Link
          href="/schedule?tab=knockout"
          className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === 'knockout'
              ? 'border-[#cc0000] text-[#cc0000]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Knockouts
          <span className="ml-1.5 text-[10px] font-normal text-gray-400">32 matches</span>
        </Link>
      </div>

      {activeTab === 'group'
        ? <GroupStage matches={groupMatches} />
        : <KnockoutStage matches={knockoutMatches} />
      }
    </div>
  )
}

// ─── Group Stage ────────────────────────────────────────────────────────────

function GroupStage({ matches }: { matches: MatchRow[] }) {
  const grouped = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    const key = m.group_code ?? '?'
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})
  const codes = Object.keys(grouped).sort()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {codes.map(code => (
        <div key={code} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
              Group {code}
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {grouped[code].map(m => (
              <GroupMatchRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupMatchRow({ m }: { m: MatchRow }) {
  const finished = m.status === 'FINISHED'
  const live = m.status === 'IN_PLAY'
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium truncate">{m.home_team?.name ?? 'TBD'}</p>
            {m.home_team && <p className="text-[10px] text-gray-400 font-mono">{m.home_team.code}</p>}
          </div>
          {m.home_team && <Flag code={m.home_team.code} size="sm" />}
        </div>
        {/* Score / vs */}
        <span className={`shrink-0 w-12 text-center text-xs font-bold ${
          finished ? 'text-gray-800' : live ? 'text-green-600' : 'text-gray-400'
        }`}>
          {finished ? `${m.home_score}–${m.away_score}` : live ? 'LIVE' : 'vs'}
        </span>
        {/* Away */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          {m.away_team && <Flag code={m.away_team.code} size="sm" />}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{m.away_team?.name ?? 'TBD'}</p>
            {m.away_team && <p className="text-[10px] text-gray-400 font-mono">{m.away_team.code}</p>}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1 leading-tight">
        <LocalTime utc={m.kickoff_at} />
      </p>
    </div>
  )
}

// ─── Knockout Stage ──────────────────────────────────────────────────────────

function KnockoutStage({ matches }: { matches: MatchRow[] }) {
  const byStage = matches.reduce<Record<string, MatchRow[]>>((acc, m) => {
    ;(acc[m.stage] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="space-y-10">
      {KO_STAGES.map(stage => {
        const stageMatches = byStage[stage]
        if (!stageMatches?.length) return null
        return (
          <section key={stage}>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
              {STAGE_LABELS[stage]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stageMatches.map(m => <KnockoutCard key={m.id} m={m} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function KnockoutCard({ m }: { m: MatchRow }) {
  const finished = m.status === 'FINISHED'
  const live = m.status === 'IN_PLAY'
  return (
    <div className={`border rounded-xl p-4 ${live ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          #{m.match_number}
        </span>
        <div className="flex items-center gap-2">
          {live && (
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              LIVE
            </span>
          )}
          {finished && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">FT</span>
          )}
          <span className="text-xs text-gray-400">
            <LocalTime utc={m.kickoff_at} />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TeamSlot team={m.home_team} />
        <div className="shrink-0 text-center w-14">
          {finished
            ? <span className="text-xl font-black text-gray-800 tabular-nums">
                {m.home_score}–{m.away_score}
              </span>
            : <span className="text-sm font-bold text-gray-300">vs</span>
          }
        </div>
        <TeamSlot team={m.away_team} />
      </div>
    </div>
  )
}

function TeamSlot({ team }: { team: { code: string; name: string } | null }) {
  if (!team) {
    return (
      <div className="flex-1 flex flex-col items-center gap-1 text-center">
        <div className="w-8 h-5 bg-gray-100 rounded" />
        <span className="text-xs font-bold text-gray-300">TBD</span>
      </div>
    )
  }
  const src = flagSrc(team.code)
  return (
    <div className="flex-1 flex flex-col items-center gap-1 text-center min-w-0">
      {src && <img src={src} alt={team.code} className="w-8 h-auto" />}
      <span className="text-xs font-bold text-gray-700">{team.code}</span>
      <span className="text-[10px] text-gray-500 leading-tight truncate w-full">{team.name}</span>
    </div>
  )
}

function Flag({ code, size }: { code: string; size: 'sm' | 'md' }) {
  const src = flagSrc(code)
  if (!src) return null
  return (
    <img
      src={src}
      alt={code}
      className={size === 'sm' ? 'w-5 h-auto shrink-0' : 'w-8 h-auto shrink-0'}
    />
  )
}
