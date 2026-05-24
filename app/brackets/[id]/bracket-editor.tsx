'use client'
import { useState, useMemo, useCallback } from 'react'
import Toast from '@/components/toast'
import GroupPredictions from './group-predictions'
import KnockoutPicker from './knockout-picker'
import StageHeader, { type Tab } from './stage-header'
import {
  predictGroupStandings,
  predictBestThirds,
  findConflicts,
  type KnockoutMatch,
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
    <div className="max-w-5xl mx-auto">
      <StageHeader
        bracketName={bracketName}
        canEdit={canEdit}
        groupPickCount={groupPickCount}
        winnerPicks={winnerPicks}
        knockoutMatches={knockoutMatches}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="px-4 py-6">
      {activeTab === 'GROUP' ? (
        <GroupPredictions
          bracketId={bracketId}
          matches={groupMatches}
          initialPredictions={initialScorePreds}
          canEdit={canEdit}
          onPredSaved={onPredSaved}
          standings={standings}
          bestThirds={bestThirds}
          teams={teams}
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
    </div>
  )
}
