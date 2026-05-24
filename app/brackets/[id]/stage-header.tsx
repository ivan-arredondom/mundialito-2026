'use client'
import Link from 'next/link'
import { CountdownText } from '@/components/countdown'
import { KNOCKOUT_STAGES } from '@/lib/bracket-structure'

export const ALL_TABS = ['GROUP', 'R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const
export type Tab = typeof ALL_TABS[number]

const STAGE_CONFIG = [
  { key: 'GROUP' as Tab, label: 'GROUP', total: 72 },
  { key: 'R32'   as Tab, label: 'R32',   total: 16 },
  { key: 'R16'   as Tab, label: 'R16',   total: 8  },
  { key: 'QF'    as Tab, label: 'QF',    total: 4  },
  { key: 'SF'    as Tab, label: 'SF',    total: 2  },
  { key: '3RD'   as Tab, label: '3RD',   total: 1  },
  { key: 'FINAL' as Tab, label: 'FINAL', total: 1  },
]

export type StageHeaderProps = {
  bracketName: string
  canEdit: boolean
  groupPickCount: number
  winnerPicks: Record<number, number>
  knockoutMatches: Array<{ id: number; match_number: number }>
  activeTab: Tab
  onTabChange: (t: Tab) => void
}

export default function StageHeader({
  bracketName,
  canEdit,
  groupPickCount,
  winnerPicks,
  knockoutMatches,
  activeTab,
  onTabChange,
}: StageHeaderProps) {
  const totalPicks = groupPickCount + Object.keys(winnerPicks).length
  const matchNumToId = new Map(knockoutMatches.map(m => [m.match_number, m.id]))

  function getStageDone(key: Tab): number {
    if (key === 'GROUP') return groupPickCount
    const stageKey = key === '3RD' ? 'THIRD' : key
    const stage = KNOCKOUT_STAGES.find(s => s.key === stageKey)
    if (!stage) return 0
    return (stage.matchNumbers as readonly number[]).filter(n => {
      const id = matchNumToId.get(n)
      return id != null && winnerPicks[id] != null
    }).length
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
      {/* Row 1: back link | title | countdown + pick count */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-1">
        <Link
          href="/dashboard"
          className="hidden md:block text-[10px] font-semibold tracking-widest uppercase text-gray-400 hover:text-gray-600 shrink-0 whitespace-nowrap"
        >
          ← All Submissions
        </Link>
        <span className="text-lg md:text-xl font-black truncate flex-1 min-w-0">{bracketName}</span>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-red-500 font-semibold border border-red-300 rounded-full px-2 py-0.5 flex items-center gap-1 whitespace-nowrap">
              <span>⏱</span>
              <CountdownText />
            </span>
            <span className="hidden md:block text-[10px] text-gray-400 font-mono whitespace-nowrap">
              {totalPicks} of 104 picks
            </span>
          </div>
        )}
      </div>

      {/* Row 2: chevron stage pills */}
      <div className="flex items-center overflow-x-auto pb-2 px-4 gap-0 scrollbar-none">
        {STAGE_CONFIG.map((stage, i) => {
          const done = getStageDone(stage.key)
          const isActive = activeTab === stage.key
          const isDone = done >= stage.total && stage.total > 0
          const pct = stage.total > 0 ? Math.min(100, (done / stage.total) * 100) : 0

          return (
            <div key={stage.key} className="flex items-center shrink-0">
              <button
                onClick={() => onTabChange(stage.key)}
                className={`relative overflow-hidden rounded-full flex items-center gap-1.5 transition-colors
                  ${isActive
                    ? 'border-[1.5px] border-[#cc0000] bg-white'
                    : isDone
                    ? 'border border-yellow-500 bg-[#f5c518]'
                    : 'border border-gray-300 bg-[#f1f3f6]'
                  }
                  ${stage.key === 'GROUP' ? 'px-3 py-1' : 'px-2.5 py-1'}
                `}
              >
                {/* Progress fill bar behind content */}
                {!isDone && pct > 0 && (
                  <div
                    className={`absolute inset-0 rounded-full ${isActive ? 'bg-red-50' : 'bg-gray-200'}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span
                  className={`relative z-10 font-extrabold tracking-widest uppercase leading-none
                    ${stage.key === 'GROUP' ? 'text-[10px]' : 'text-[9px]'}
                    ${isActive ? 'text-[#cc0000]' : isDone ? 'text-black' : 'text-gray-500'}
                  `}
                >
                  {stage.label}
                </span>
                <span
                  className={`relative z-10 font-mono leading-none
                    ${stage.key === 'GROUP' ? 'text-[10px]' : 'text-[9px]'}
                    ${isActive ? 'text-red-400' : isDone ? 'text-black font-bold' : 'text-gray-400'}
                  `}
                >
                  {isDone ? '✓' : `${done}/${stage.total}`}
                </span>
              </button>
              {i < STAGE_CONFIG.length - 1 && (
                <span className="text-gray-300 text-[10px] mx-0.5 shrink-0 select-none">›</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
