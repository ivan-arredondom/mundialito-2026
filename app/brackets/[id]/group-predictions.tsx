'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import SaveIndicator from '@/components/save-indicator'
import { flagSrc } from '@/lib/flags'

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

function timeUntil(utc: string): string {
  const diff = new Date(utc).getTime() - Date.now()
  if (diff <= 0) return 'Started'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `in ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `in ${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `in ${d}d ${h % 24}h`
}

function KickoffTime({ utc }: { utc: string }) {
  const [label, setLabel] = useState('')
  const [until, setUntil] = useState('')

  useEffect(() => {
    const d = new Date(utc)
    setLabel(
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        '\n' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    )
    setUntil(timeUntil(utc))
    const id = setInterval(() => setUntil(timeUntil(utc)), 60000)
    return () => clearInterval(id)
  }, [utc])

  if (!label) {
    const d = new Date(utc)
    return <>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</>
  }
  const [date, time] = label.split('\n')
  return (
    <>
      {date}<br />{time}
      <br />
      <span className="text-[9px] text-red-400">{until}</span>
    </>
  )
}

export default function GroupPredictions({
  bracketId,
  matches,
  initialPredictions,
  canEdit,
  onPredSaved,
}: {
  bracketId: string
  matches: Match[]
  initialPredictions: Prediction[]
  canEdit: boolean
  onPredSaved: (matchId: number, home: number, away: number) => void
}) {
  const supabase = createClient()
  const [preds, setPreds] = useState<Record<number, { home: string; away: string }>>(() => {
    const map: Record<number, { home: string; away: string }> = {}
    for (const p of initialPredictions) {
      map[p.match_id] = { home: String(p.home_score), away: String(p.away_score) }
    }
    return map
  })
  const [saveStatus, setSaveStatus] = useState<Record<number, 'idle' | 'saving' | 'saved'>>({})

  const save = useCallback(
    async (matchId: number) => {
      const p = preds[matchId]
      if (!p || p.home === '' || p.away === '') return
      setSaveStatus(s => ({ ...s, [matchId]: 'saving' }))
      await supabase.from('score_predictions').upsert({
        bracket_id: bracketId,
        match_id: matchId,
        home_score: Number(p.home),
        away_score: Number(p.away),
      })
      setSaveStatus(s => ({ ...s, [matchId]: 'saved' }))
      onPredSaved(matchId, Number(p.home), Number(p.away))
    },
    [preds, bracketId, supabase, onPredSaved]
  )

  const groups = matches.reduce<Record<string, Match[]>>((acc, m) => {
    ;(acc[m.group_code] ??= []).push(m)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([grp, grpMatches]) => (
          <div key={grp} className="border border-gray-200 rounded-xl p-4">
            <p className="font-black text-xs uppercase tracking-widest mb-3 text-gray-600">
              Group {grp}
            </p>
            <div className="space-y-3">
              {grpMatches.map(m => {
                const pred = preds[m.id]
                const hasPred = pred !== undefined && pred.home !== '' && pred.away !== ''
                const status = saveStatus[m.id] ?? 'idle'

                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2">
                      {/* Time — hidden on mobile, visible on sm+ */}
                      <span className="hidden sm:block text-[10px] text-gray-400 w-20 shrink-0 leading-tight">
                        <KickoffTime utc={m.kickoff_at} />
                      </span>
                      <div className="flex-1 text-right min-w-0">
                        <span className="text-xs font-semibold flex items-center justify-end gap-1">
                          <span className="truncate">{m.home_team.name}</span>
                          <Flag code={m.home_team.code} />
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ScoreInput
                          value={pred?.home ?? ''}
                          onChange={v =>
                            setPreds(p => ({
                              ...p,
                              [m.id]: { ...(p[m.id] ?? { home: '', away: '' }), home: v },
                            }))
                          }
                          onBlur={() => save(m.id)}
                          disabled={!canEdit}
                        />
                        <span className="text-gray-400 text-xs">-</span>
                        <ScoreInput
                          value={pred?.away ?? ''}
                          onChange={v =>
                            setPreds(p => ({
                              ...p,
                              [m.id]: { ...(p[m.id] ?? { home: '', away: '' }), away: v },
                            }))
                          }
                          onBlur={() => save(m.id)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold flex items-center gap-1">
                          <Flag code={m.away_team.code} />
                          <span className="truncate">{m.away_team.name}</span>
                        </span>
                      </div>
                    </div>
                    {/* Time — mobile only, shown below match row */}
                    <p className="sm:hidden text-[10px] text-gray-400 text-center mt-0.5 leading-tight">
                      <KickoffTime utc={m.kickoff_at} />
                    </p>
                    <div className="flex justify-end mt-0.5 min-h-[14px]">
                      {status !== 'idle' ? (
                        <SaveIndicator status={status} />
                      ) : !hasPred && canEdit ? (
                        <span className="text-[10px] text-gray-400 italic">
                          Estimate until kickoff
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

function Flag({ code }: { code: string }) {
  const src = flagSrc(code)
  if (!src) return null
  return <img src={src} alt={code} className="w-5 h-auto inline-block shrink-0" />
}

function ScoreInput({
  value,
  onChange,
  onBlur,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  disabled: boolean
}) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      disabled={disabled}
      className="w-10 sm:w-9 text-center border border-gray-300 rounded px-1 py-1 sm:py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#cc0000] disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}
