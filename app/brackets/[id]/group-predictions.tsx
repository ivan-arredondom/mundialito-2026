'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import SaveIndicator from '@/components/save-indicator'
import { flagSrc } from '@/lib/flags'
import { type GroupStanding } from '@/lib/standings'

type Team = { id: number; code: string; name: string; flag_url: string | null }
type Match = {
  id: number
  group_code: string
  kickoff_at: string
  home_score: number | null
  away_score: number | null
  status: string
  home_team: Team
  away_team: Team
}
type Prediction = { match_id: number; home_score: number; away_score: number }

// ─── helpers ────────────────────────────────────────────────────────────────

function formatKickoff(kickoff: string): string {
  const d = new Date(kickoff)
  const date = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

// Assigns matchday 1/2/3 based on sorted position within group
function buildMatchdayMap(grpMatches: Match[]): Map<number, number> {
  const sorted = [...grpMatches].sort(
    (a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
  )
  const map = new Map<number, number>()
  sorted.forEach((m, i) => map.set(m.id, Math.floor(i / 2) + 1))
  return map
}

// ─── Flag ────────────────────────────────────────────────────────────────────

function Flag({ code, size = 'sm' }: { code: string; size?: 'sm' | 'xs' }) {
  const src = flagSrc(code)
  if (!src) return null
  return (
    <img
      src={src}
      alt={code}
      className={size === 'sm' ? 'w-6 h-auto shrink-0' : 'w-4 h-auto shrink-0'}
    />
  )
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({
  value,
  onInc,
  onDec,
  disabled,
}: {
  value: string
  onInc: () => void
  onDec: () => void
  disabled: boolean
}) {
  const isEmpty = value === ''

  if (disabled) {
    return (
      <span className="w-8 text-center text-base font-black font-mono tabular-nums text-gray-700 flex items-center justify-center">
        {isEmpty ? '–' : value}
      </span>
    )
  }

  return (
    <div className="flex items-stretch h-11 md:h-9 rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onDec}
        className="w-11 md:w-8 bg-gray-50 text-gray-500 text-base font-extrabold active:bg-gray-200 transition-colors flex items-center justify-center select-none"
        aria-label="Decrease"
      >
        −
      </button>
      <span
        className={`w-10 md:w-9 text-center text-base font-black font-mono tabular-nums flex items-center justify-center select-none ${
          isEmpty ? 'text-gray-300' : 'text-gray-900'
        }`}
      >
        {isEmpty ? '–' : value}
      </span>
      <button
        type="button"
        onClick={onInc}
        className="w-11 md:w-8 bg-gray-50 text-gray-500 text-base font-extrabold active:bg-gray-200 transition-colors flex items-center justify-center select-none"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

// ─── Match card ──────────────────────────────────────────────────────────────

function MatchCard({
  match,
  matchday,
  homeVal,
  awayVal,
  saveStatus,
  canEdit,
  onStep,
}: {
  match: Match
  matchday: number
  homeVal: string
  awayVal: string
  saveStatus: 'idle' | 'saving' | 'saved'
  canEdit: boolean
  onStep: (matchId: number, side: 'home' | 'away', dir: 1 | -1) => void
}) {
  const hasPred = homeVal !== '' && awayVal !== ''

  return (
    <div className="border border-gray-200 rounded-2xl bg-white p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-extrabold tracking-widest text-gray-500 uppercase leading-none">
          Group {match.group_code} · MD{matchday}
        </span>
        <span className="text-[10px] text-gray-400 font-semibold leading-none">
          {formatKickoff(match.kickoff_at)}
        </span>
      </div>

      {/* Teams + steppers */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <Flag code={match.home_team.code} />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate leading-tight">{match.home_team.name}</p>
            <p className="text-[10px] text-gray-400 font-mono leading-tight">{match.home_team.code}</p>
          </div>
        </div>

        {/* Steppers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Stepper
            value={homeVal}
            onInc={() => onStep(match.id, 'home', 1)}
            onDec={() => onStep(match.id, 'home', -1)}
            disabled={!canEdit}
          />
          <span className="text-gray-400 font-bold text-sm select-none">:</span>
          <Stepper
            value={awayVal}
            onInc={() => onStep(match.id, 'away', 1)}
            onDec={() => onStep(match.id, 'away', -1)}
            disabled={!canEdit}
          />
        </div>

        {/* Away */}
        <div className="flex-1 min-w-0 flex items-center justify-end gap-1.5">
          <div className="min-w-0 text-right">
            <p className="text-sm font-bold truncate leading-tight">{match.away_team.name}</p>
            <p className="text-[10px] text-gray-400 font-mono leading-tight">{match.away_team.code}</p>
          </div>
          <Flag code={match.away_team.code} />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between min-h-[14px]">
        {canEdit ? (
          <span className="text-[10px] text-gray-400 italic">
            {hasPred ? '↑ Tap +/− to adjust' : 'Estimate until kickoff'}
          </span>
        ) : (
          <span />
        )}
        {saveStatus !== 'idle' ? <SaveIndicator status={saveStatus} /> : <span />}
      </div>
    </div>
  )
}

// ─── Standings strip ─────────────────────────────────────────────────────────

type TeamStats = { w: number; d: number; l: number; p: number }

function StandingsStrip({
  grpMatches,
  standings,
  bestThirds,
  preds,
  teamsById,
}: {
  grpMatches: Match[]
  standings: GroupStanding[]
  bestThirds: number[]
  preds: Record<number, { home: string; away: string }>
  teamsById: Record<number, Team>
}) {
  const stats = useMemo<Record<number, TeamStats>>(() => {
    const map: Record<number, TeamStats> = {}
    for (const m of grpMatches) {
      map[m.home_team.id] ??= { w: 0, d: 0, l: 0, p: 0 }
      map[m.away_team.id] ??= { w: 0, d: 0, l: 0, p: 0 }
      const pred = preds[m.id]
      if (!pred || pred.home === '' || pred.away === '') continue
      const h = Number(pred.home), a = Number(pred.away)
      map[m.home_team.id].p++
      map[m.away_team.id].p++
      if (h > a) {
        map[m.home_team.id].w++
        map[m.away_team.id].l++
      } else if (h === a) {
        map[m.home_team.id].d++
        map[m.away_team.id].d++
      } else {
        map[m.home_team.id].l++
        map[m.away_team.id].w++
      }
    }
    return map
  }, [grpMatches, preds])

  const bestThirdsSet = useMemo(() => new Set(bestThirds), [bestThirds])

  return (
    <div className="border border-gray-100 rounded-xl bg-gray-50 overflow-hidden mt-3">
      <div className="px-3 py-2 flex items-baseline gap-2">
        <span className="text-[10px] font-extrabold tracking-widest uppercase text-gray-600">
          Live Predicted Standings
        </span>
        <span className="text-[10px] text-gray-400">
          · updates as you pick · top 2 advance, 3rd may qualify
        </span>
      </div>

      {/* Desktop column headers */}
      <div className="hidden md:grid px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400"
        style={{ gridTemplateColumns: '1.5rem 1.5rem 1fr 2rem 2rem 2rem 2rem 2.5rem 2.5rem' }}>
        <span>#</span>
        <span />
        <span>Team</span>
        <span className="text-right">P</span>
        <span className="text-right">W</span>
        <span className="text-right">D</span>
        <span className="text-right">L</span>
        <span className="text-right">GD</span>
        <span className="text-right">PTS</span>
      </div>

      {standings.map((s, idx) => {
        const team = teamsById[s.team_id]
        if (!team) return null
        const st = stats[s.team_id] ?? { w: 0, d: 0, l: 0, p: 0 }
        const isTop2 = idx < 2
        const isBestThird = idx === 2 && bestThirdsSet.has(s.team_id)
        const gdStr = s.gd > 0 ? `+${s.gd}` : `${s.gd}`

        let badgeClass = 'text-gray-400 bg-transparent'
        if (isTop2) badgeClass = 'bg-[#f5c518] text-black'
        else if (isBestThird) badgeClass = 'bg-orange-400 text-black'

        const dimText = idx >= 2 && !isBestThird

        return (
          <div
            key={s.team_id}
            className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-100"
          >
            {/* Rank badge */}
            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${badgeClass}`}>
              {idx + 1}
            </span>
            <Flag code={team.code} size="xs" />
            <span className={`flex-1 text-xs font-semibold truncate ${dimText ? 'text-gray-400' : 'text-gray-800'}`}>
              {team.name}
            </span>

            {/* Desktop: P W D L GD PTS */}
            <div
              className="hidden md:grid tabular-nums text-right text-[11px] gap-x-1"
              style={{ gridTemplateColumns: '2rem 2rem 2rem 2rem 2.5rem 2.5rem' }}
            >
              <span className="text-gray-400">{st.p}</span>
              <span className="text-gray-400">{st.w}</span>
              <span className="text-gray-400">{st.d}</span>
              <span className="text-gray-400">{st.l}</span>
              <span className={`font-semibold ${s.gd > 0 ? 'text-gray-700' : s.gd < 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                {gdStr}
              </span>
              <span className="font-black font-mono text-[#cc0000]">{s.pts}</span>
            </div>

            {/* Mobile: GD PTS */}
            <div className="md:hidden flex items-center gap-3 tabular-nums text-[11px]">
              <span className={`font-semibold ${s.gd > 0 ? 'text-gray-700' : s.gd < 0 ? 'text-gray-400' : 'text-gray-500'}`}>
                {gdStr}
              </span>
              <span className="font-black font-mono text-[#cc0000] w-6 text-right">{s.pts}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Group accordion card ────────────────────────────────────────────────────

function GroupCard({
  grpCode,
  grpMatches,
  preds,
  saveStatus,
  canEdit,
  standings,
  bestThirds,
  teamsById,
  isOpen,
  onToggle,
  onStep,
}: {
  grpCode: string
  grpMatches: Match[]
  preds: Record<number, { home: string; away: string }>
  saveStatus: Record<number, 'idle' | 'saving' | 'saved'>
  canEdit: boolean
  standings: GroupStanding[]
  bestThirds: number[]
  teamsById: Record<number, Team>
  isOpen: boolean
  onToggle: () => void
  onStep: (matchId: number, side: 'home' | 'away', dir: 1 | -1) => void
}) {
  const sortedMatches = useMemo(
    () => [...grpMatches].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()),
    [grpMatches]
  )
  const matchdayMap = useMemo(() => buildMatchdayMap(grpMatches), [grpMatches])

  const pickedCount = grpMatches.filter(m => {
    const p = preds[m.id]
    return p && p.home !== '' && p.away !== ''
  }).length

  // Unique teams in group from match data
  const teams = useMemo(() => {
    const seen = new Set<number>()
    const list: Team[] = []
    for (const m of sortedMatches) {
      if (!seen.has(m.home_team.id)) { seen.add(m.home_team.id); list.push(m.home_team) }
      if (!seen.has(m.away_team.id)) { seen.add(m.away_team.id); list.push(m.away_team) }
    }
    return list
  }, [sortedMatches])

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-sm shrink-0 ${
          isOpen ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
        }`}>
          {grpCode}
        </div>

        <div className="flex-1 min-w-0">
          {isOpen && (
            <p className="text-[9px] font-extrabold tracking-widest uppercase text-gray-400 mb-0.5">
              Group
            </p>
          )}
          <div className="flex items-center gap-1.5">
            {teams.map(t => <Flag key={t.id} code={t.code} size="xs" />)}
            <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
              {teams.map(t => t.name).join(' · ')}
            </span>
          </div>
          {isOpen && (
            <p className="text-[10px] text-gray-400 mt-0.5">{pickedCount} of 6 matches picked</p>
          )}
        </div>

        {!isOpen && (
          <>
            <span className="text-[10px] text-gray-500 font-mono shrink-0">{pickedCount}/6</span>
            <div className="flex gap-0.5 shrink-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-1.5 rounded-full ${i < pickedCount ? 'bg-[#cc0000]' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </>
        )}

        <span className={`text-gray-400 text-base shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
          ›
        </span>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {sortedMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                matchday={matchdayMap.get(m.id) ?? 1}
                homeVal={preds[m.id]?.home ?? ''}
                awayVal={preds[m.id]?.away ?? ''}
                saveStatus={saveStatus[m.id] ?? 'idle'}
                canEdit={canEdit}
                onStep={onStep}
              />
            ))}
          </div>

          {standings.length > 0 && (
            <StandingsStrip
              grpMatches={grpMatches}
              standings={standings}
              bestThirds={bestThirds}
              preds={preds}
              teamsById={teamsById}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GroupPredictions({
  bracketId,
  matches,
  initialPredictions,
  canEdit,
  onPredSaved,
  standings,
  bestThirds,
  teams,
}: {
  bracketId: string
  matches: Match[]
  initialPredictions: Prediction[]
  canEdit: boolean
  onPredSaved: (matchId: number, home: number, away: number) => void
  standings: Record<string, GroupStanding[]>
  bestThirds: number[]
  teams: Team[]
}) {
  const supabase = createClient()

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map(t => [t.id, t])),
    [teams]
  )

  const [preds, setPreds] = useState<Record<number, { home: string; away: string }>>(() => {
    const map: Record<number, { home: string; away: string }> = {}
    for (const p of initialPredictions) {
      map[p.match_id] = { home: String(p.home_score), away: String(p.away_score) }
    }
    return map
  })

  const [saveStatus, setSaveStatus] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({})

  const [view, setView] = useState<'group' | 'matchday'>('group')

  const storageKey = `bracket-accordion-${bracketId}`

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) return JSON.parse(stored) as Record<string, boolean>
      } catch {}
    }
    return { A: true }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(openGroups)) } catch {}
  }, [openGroups, storageKey])

  const groups = useMemo(
    () =>
      matches.reduce<Record<string, Match[]>>((acc, m) => {
        ;(acc[m.group_code] ??= []).push(m)
        return acc
      }, {}),
    [matches]
  )

  const sortedGroupCodes = useMemo(
    () => Object.keys(groups).sort((a, b) => a.localeCompare(b)),
    [groups]
  )

  // For matchday view: assign MD1/2/3 across all groups, group by MD, sort each by kickoff
  const matchdayGroups = useMemo(() => {
    const byMD: Record<number, Match[]> = { 1: [], 2: [], 3: [] }
    for (const [, grpMatches] of Object.entries(groups)) {
      const mdMap = buildMatchdayMap(grpMatches)
      for (const m of grpMatches) {
        const md = mdMap.get(m.id) ?? 1
        byMD[md].push(m)
      }
    }
    for (const md of [1, 2, 3]) {
      byMD[md].sort((a, b) => new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime())
    }
    return byMD
  }, [groups])

  const saveValues = useCallback(
    async (matchId: number, homeStr: string, awayStr: string) => {
      if (homeStr === '' || awayStr === '') return
      setSaveStatus(s => ({ ...s, [matchId]: 'saving' }))
      await supabase.from('score_predictions').upsert({
        bracket_id: bracketId,
        match_id: matchId,
        home_score: Number(homeStr),
        away_score: Number(awayStr),
      })
      setSaveStatus(s => ({ ...s, [matchId]: 'saved' }))
      onPredSaved(matchId, Number(homeStr), Number(awayStr))
    },
    [bracketId, supabase, onPredSaved]
  )

  // Reads current preds synchronously, computes new value, updates state, and saves if both sides set
  const handleStep = useCallback(
    (matchId: number, side: 'home' | 'away', dir: 1 | -1) => {
      setPreds(prev => {
        const cur = prev[matchId] ?? { home: '', away: '' }
        const curVal = cur[side]
        const nextVal =
          curVal === '' ? '0' : String(Math.max(0, Math.min(20, Number(curVal) + dir)))
        const newEntry = { ...cur, [side]: nextVal }
        // Schedule the DB save after state update
        if (newEntry.home !== '' && newEntry.away !== '') {
          setTimeout(() => saveValues(matchId, newEntry.home, newEntry.away), 0)
        }
        return { ...prev, [matchId]: newEntry }
      })
    },
    [saveValues]
  )

  const toggleGroup = useCallback((grpCode: string) => {
    setOpenGroups(prev => ({ ...prev, [grpCode]: !prev[grpCode] }))
  }, [])

  return (
    <div className="space-y-4">
      {/* View toggle + caption */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setView('group')}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
              view === 'group'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            By group
          </button>
          <button
            type="button"
            onClick={() => setView('matchday')}
            className={`px-3 py-1.5 text-sm font-semibold border-l border-gray-200 transition-colors ${
              view === 'matchday'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            By matchday
          </button>
        </div>
        <span className="text-[11px] text-gray-400">
          {view === 'group'
            ? `· ${sortedGroupCodes.length} groups · auto-saves`
            : '· 3 matchdays · auto-saves'}
        </span>
      </div>

      {view === 'group' ? (
        /* ── By group ── */
        <div className="space-y-3">
          {sortedGroupCodes.map(grpCode => (
            <GroupCard
              key={grpCode}
              grpCode={grpCode}
              grpMatches={groups[grpCode]}
              preds={preds}
              saveStatus={saveStatus}
              canEdit={canEdit}
              standings={standings[grpCode] ?? []}
              bestThirds={bestThirds}
              teamsById={teamsById}
              isOpen={!!openGroups[grpCode]}
              onToggle={() => toggleGroup(grpCode)}
              onStep={handleStep}
            />
          ))}
        </div>
      ) : (
        /* ── By matchday ── */
        <div className="space-y-6">
          {([1, 2, 3] as const).map(md => {
            const mdMatches = matchdayGroups[md]
            if (!mdMatches?.length) return null
            const mdMap = new Map(mdMatches.map(m => [m.id, md]))
            return (
              <div key={md}>
                <h2 className="text-xs font-extrabold tracking-widest uppercase text-gray-500 mb-3">
                  Matchday {md}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mdMatches.map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      matchday={mdMap.get(m.id) ?? md}
                      homeVal={preds[m.id]?.home ?? ''}
                      awayVal={preds[m.id]?.away ?? ''}
                      saveStatus={saveStatus[m.id] ?? 'idle'}
                      canEdit={canEdit}
                      onStep={handleStep}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
