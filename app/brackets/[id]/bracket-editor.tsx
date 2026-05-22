'use client'
import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { CountdownText } from '@/components/countdown'
import Toast from '@/components/toast'
import GroupPredictions from './group-predictions'
import KnockoutPicker from './knockout-picker'
import {
  predictGroupStandings,
  predictBestThirds,
  findConflicts,
  type KnockoutMatch,
  type GroupStanding,
  type ScorePrediction,
} from '@/lib/standings'
import { KNOCKOUT_STAGES } from '@/lib/bracket-structure'

type Team = { id: number; code: string; name: string; flag_url: string | null }
type GroupMatch = {
  id: number
  group_code: string
  kickoff_at: string
  home_score: number | null
  away_score: number | null
  status: string
  home_team: Team
  away_team: Team
}

const ALL_TABS = ['GROUP', 'R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const
type Tab = typeof ALL_TABS[number]

export default function BracketEditor({
  bracketName,
  bracketId,
  groupMatches,
  knockoutMatches,
  teams,
  initialScorePreds,
  initialWinnerPicks,
  canEdit,
}: {
  bracketName: string
  bracketId: string
  groupMatches: GroupMatch[]
  knockoutMatches: KnockoutMatch[]
  teams: Team[]
  initialScorePreds: ScorePrediction[]
  initialWinnerPicks: Record<number, number>
  canEdit: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('GROUP')
  const [scorePreds, setScorePreds] = useState<ScorePrediction[]>(initialScorePreds)
  const [winnerPicks, setWinnerPicks] = useState<Record<number, number>>(initialWinnerPicks)
  const [toastDismissed, setToastDismissed] = useState(false)

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map(t => [t.id, t])),
    [teams]
  )

  const groupMatchesForStandings = useMemo(
    () =>
      groupMatches
        .filter(m => m.home_team && m.away_team)
        .map(m => ({
          id: m.id,
          group_code: m.group_code,
          home_team_id: m.home_team.id,
          away_team_id: m.away_team.id,
        })),
    [groupMatches]
  )

  const standings = useMemo(
    () => predictGroupStandings(scorePreds, groupMatchesForStandings, teams),
    [scorePreds, groupMatchesForStandings, teams]
  )

  const bestThirds = useMemo(() => predictBestThirds(standings), [standings])

  const conflicts = useMemo(
    () => findConflicts(knockoutMatches, winnerPicks, standings, bestThirds),
    [knockoutMatches, winnerPicks, standings, bestThirds]
  )

  const conflictMatchIds = useMemo(
    () => new Set(conflicts.map(c => c.matchId)),
    [conflicts]
  )

  const groupPickCount = useMemo(
    () =>
      scorePreds.filter(p => p.home_score != null && p.away_score != null).length,
    [scorePreds]
  )

  const koPickCount = useMemo(() => Object.keys(winnerPicks).length, [winnerPicks])

  const onPredSaved = useCallback((matchId: number, home: number, away: number) => {
    setScorePreds(prev => {
      const existing = prev.findIndex(p => p.match_id === matchId)
      const updated = { match_id: matchId, home_score: home, away_score: away }
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = updated
        return next
      }
      return [...prev, updated]
    })
  }, [])

  const onPickSaved = useCallback((matchId: number, teamId: number | null) => {
    setWinnerPicks(prev => {
      if (teamId == null) {
        const { [matchId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [matchId]: teamId }
    })
  }, [])

  const activeKOStage = KNOCKOUT_STAGES.find(s => {
    if (activeTab === '3RD') return s.key === 'THIRD'
    return s.key === activeTab
  })
  const stageMatches = activeKOStage
    ? knockoutMatches.filter(m => (activeKOStage.matchNumbers as readonly number[]).includes(m.match_number))
    : []

  const toastMessages = conflicts.map(
    c => `Match #${c.matchNumber} (${c.stage}): ${c.reason}`
  )
  const showToast = toastMessages.length > 0 && !toastDismissed

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Link
        href="/dashboard"
        className="text-xs text-gray-400 hover:text-gray-600 uppercase tracking-widest mb-2 inline-block"
      >
        ← All Submissions
      </Link>
      <h1 className="text-2xl md:text-3xl font-black mb-4 truncate">{bracketName}</h1>

      {canEdit && (
        <div className="border border-red-300 bg-red-50 rounded-xl px-4 py-2 mb-4 text-sm text-red-600 font-medium">
          <CountdownText />
        </div>
      )}

      <div className="space-y-2 mb-4">
        <ProgressBar label={`${groupPickCount} / 72 group stage matches`} value={groupPickCount} max={72} />
        <ProgressBar label={`${koPickCount} / 32 knockout picks`} value={koPickCount} max={32} />
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {ALL_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all shrink-0 ${
              activeTab === tab
                ? 'bg-[#cc0000] text-white border-[#cc0000]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#cc0000]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'GROUP' ? (
        <GroupPredictions
          bracketId={bracketId}
          matches={groupMatches}
          initialPredictions={initialScorePreds}
          canEdit={canEdit}
          onPredSaved={onPredSaved}
        />
      ) : (
        <KnockoutPicker
          bracketId={bracketId}
          stageMatches={stageMatches}
          allKnockoutMatches={knockoutMatches}
          teamsById={teamsById}
          winnerPicks={winnerPicks}
          standings={standings}
          bestThirds={bestThirds}
          canEdit={canEdit}
          onPickSaved={onPickSaved}
          conflictMatchIds={conflictMatchIds}
        />
      )}

      <Toast
        messages={showToast ? toastMessages : []}
        onDismiss={() => setToastDismissed(true)}
      />
    </div>
  )
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">{pct}%</span>
      </div>
      <div className="bg-gray-200 rounded-full h-1.5">
        <div className="bg-[#cc0000] h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
