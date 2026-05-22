'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  resolveKnockoutTeams,
  type KnockoutMatch,
  type GroupStanding,
} from '@/lib/standings'
import SaveIndicator from '@/components/save-indicator'
import { flagSrc } from '@/lib/flags'

type Team = { id: number; code: string; name: string; flag_url: string | null }

export default function KnockoutPicker({
  bracketId,
  stageMatches,
  allKnockoutMatches,
  teamsById,
  winnerPicks,
  standings,
  bestThirds,
  canEdit,
  onPickSaved,
  conflictMatchIds,
}: {
  bracketId: string
  stageMatches: KnockoutMatch[]
  allKnockoutMatches: KnockoutMatch[]
  teamsById: Record<number, Team>
  winnerPicks: Record<number, number>
  standings: Record<string, GroupStanding[]>
  bestThirds: number[]
  canEdit: boolean
  onPickSaved: (matchId: number, teamId: number | null) => void
  conflictMatchIds: Set<number>
}) {
  const supabase = createClient()
  const [localPicks, setLocalPicks] = useState<Record<number, number>>(winnerPicks)
  const [saveStatus, setSaveStatus] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({})

  const pick = useCallback(
    async (matchId: number, teamId: number) => {
      if (!canEdit) return
      const current = localPicks[matchId]
      const isToggleOff = current === teamId

      setLocalPicks(p => {
        if (isToggleOff) {
          const { [matchId]: _removed, ...rest } = p
          return rest
        }
        return { ...p, [matchId]: teamId }
      })
      setSaveStatus(s => ({ ...s, [matchId]: 'saving' }))

      if (isToggleOff) {
        await supabase
          .from('knockout_winner_picks')
          .delete()
          .match({ bracket_id: bracketId, match_id: matchId })
        onPickSaved(matchId, null)
      } else {
        await supabase
          .from('knockout_winner_picks')
          .upsert({ bracket_id: bracketId, match_id: matchId, winner_team_id: teamId })
        onPickSaved(matchId, teamId)
      }

      setSaveStatus(s => ({ ...s, [matchId]: 'saved' }))
    },
    [localPicks, canEdit, bracketId, supabase, onPickSaved]
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stageMatches.map(match => {
        const { teamA: teamAId, teamB: teamBId } = resolveKnockoutTeams(
          match,
          allKnockoutMatches,
          standings,
          bestThirds,
          localPicks
        )
        const teamA = teamAId != null ? teamsById[teamAId] ?? null : null
        const teamB = teamBId != null ? teamsById[teamBId] ?? null : null
        const picked = localPicks[match.id]
        const isTBD = teamAId == null || teamBId == null
        const isConflict = conflictMatchIds.has(match.id)
        const status = saveStatus[match.id] ?? 'idle'
        const isR32 = match.stage === 'R32'

        return (
          <div
            key={match.id}
            className={`border rounded-xl p-4 ${
              isConflict ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
                {match.stage} · #{match.match_number}
              </span>
              {match.kickoff_at && (
                <span className="text-xs text-gray-400 text-right">
                  {new Date(match.kickoff_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
              <TeamSlot team={teamA} />
              <span className="text-xs font-bold text-gray-400 shrink-0">VS</span>
              <TeamSlot team={teamB} />
            </div>

            {isTBD && (
              <p className="text-xs text-gray-400 italic text-center mb-3">
                {isR32
                  ? 'Complete group stage predictions to unlock this match'
                  : 'Pick a winner in the previous round to unlock this match'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <PickButton
                team={teamA}
                selected={picked === teamAId}
                disabled={!canEdit || teamAId == null}
                onClick={() => teamAId != null && pick(match.id, teamAId)}
              />
              <PickButton
                team={teamB}
                selected={picked === teamBId}
                disabled={!canEdit || teamBId == null}
                onClick={() => teamBId != null && pick(match.id, teamBId)}
              />
            </div>

            <div className="mt-2 min-h-[16px]">
              {status !== 'idle' ? (
                <SaveIndicator status={status} />
              ) : picked != null ? (
                <span className="text-xs text-gray-400">Winner picked</span>
              ) : (
                <span className="text-xs text-gray-400">Pick a winner</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TeamSlot({
  team,
}: {
  team: { code: string; name: string; flag_url: string | null } | null
}) {
  if (!team) {
    return (
      <div className="flex flex-col items-center gap-0.5 w-16 sm:w-20 text-center">
        <span className="text-2xl text-red-400">?</span>
        <span className="text-xs font-bold text-gray-400">TBD</span>
      </div>
    )
  }
  const src = flagSrc(team.code)
  return (
    <div className="flex flex-col items-center gap-0.5 w-16 sm:w-20 text-center">
      {src && <img src={src} alt={team.code} className="w-8 h-auto" />}
      <span className="text-xs font-bold text-gray-700">{team.code}</span>
      <span className="text-[10px] text-gray-500 leading-tight">{team.name}</span>
    </div>
  )
}

function PickButton({
  team,
  selected,
  disabled,
  onClick,
}: {
  team: { code: string; name: string; flag_url: string | null } | null
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  const src = team ? flagSrc(team.code) : null
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
        selected
          ? 'bg-[#cc0000] text-white border-[#cc0000]'
          : 'bg-white text-gray-700 border-gray-300 hover:border-[#cc0000] disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
    >
      {src && <img src={src} alt="" className="w-4 h-auto shrink-0" />}
      <span className="truncate">{team ? `${team.code} ${team.name}` : 'TBD'}</span>
    </button>
  )
}
