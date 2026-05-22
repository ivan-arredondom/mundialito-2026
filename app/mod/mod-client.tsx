'use client'
import { useState, useEffect, useCallback } from 'react'

type PrizeSplit = { place: number; pct: number }

interface Group {
  id: number
  name: string
  code: string
  max_brackets_per_user: number | null
  max_members: number | null
  entry_fee: number
  fee_per: 'person' | 'bracket'
  platform_fee_pct: number
  prize_splits: PrizeSplit[]
}

interface Member {
  user_id: string
  role: string
  paid: boolean
  joined_at: string
  profiles: { display_name: string }
}

export default function ModClient({ groups, currentUserId }: { groups: Group[]; currentUserId: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(
    groups.length === 1 ? new Set([groups[0].id]) : new Set()
  )
  const [membersByGroup, setMembersByGroup] = useState<Record<number, Member[]>>({})
  const [prizeSettings, setPrizeSettings] = useState<Record<number, {
    entry_fee: number
    fee_per: 'person' | 'bracket'
    prize_splits: PrizeSplit[]
  }>>(
    Object.fromEntries(groups.map(g => [g.id, {
      entry_fee: g.entry_fee,
      fee_per: g.fee_per,
      prize_splits: [...g.prize_splits],
    }]))
  )
  const [prizeOpen, setPrizeOpen] = useState<Set<number>>(new Set())
  const [msg, setMsg] = useState('')

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const loadMembers = useCallback(async (groupId: number) => {
    const res = await fetch(`/api/mod/members?group_id=${groupId}`)
    const data = await res.json()
    if (!res.ok) {
      flash(`Error loading members: ${data.error ?? res.status}`)
      return
    }
    setMembersByGroup(m => ({ ...m, [groupId]: Array.isArray(data) ? data : [] }))
  }, [])

  // Fetch members for groups that start expanded
  useEffect(() => {
    for (const groupId of expanded) {
      loadMembers(groupId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleExpand(groupId: number) {
    if (expanded.has(groupId)) {
      setExpanded(e => { const n = new Set(e); n.delete(groupId); return n })
      return
    }
    setExpanded(e => new Set([...e, groupId]))
    if (!membersByGroup[groupId]) {
      await loadMembers(groupId)
    }
  }

  async function togglePaid(groupId: number, member: Member) {
    const next = !member.paid
    const name = (member.profiles as unknown as { display_name: string })?.display_name
    setMembersByGroup(m => ({
      ...m,
      [groupId]: m[groupId].map(x => x.user_id === member.user_id ? { ...x, paid: next } : x),
    }))
    const res = await fetch('/api/mod/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: member.user_id, paid: next }),
    })
    if (res.ok) {
      flash(`${name} marked as ${next ? 'paid' : 'unpaid'}`)
    } else {
      setMembersByGroup(m => ({
        ...m,
        [groupId]: m[groupId].map(x => x.user_id === member.user_id ? { ...x, paid: !next } : x),
      }))
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    }
  }

  async function toggleRole(groupId: number, member: Member) {
    const next = member.role === 'mod' ? 'member' : 'mod'
    const name = (member.profiles as unknown as { display_name: string })?.display_name
    const res = await fetch('/api/mod/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: member.user_id, role: next }),
    })
    if (res.ok) {
      setMembersByGroup(m => ({
        ...m,
        [groupId]: m[groupId].map(x => x.user_id === member.user_id ? { ...x, role: next } : x),
      }))
      flash(`${name} is now ${next}`)
    } else {
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    }
  }

  async function removeMember(groupId: number, member: Member) {
    const name = (member.profiles as unknown as { display_name: string })?.display_name
    if (!confirm(`Remove ${name} from this group?`)) return
    const res = await fetch('/api/mod/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: member.user_id }),
    })
    if (res.ok) {
      setMembersByGroup(m => ({
        ...m,
        [groupId]: m[groupId].filter(x => x.user_id !== member.user_id),
      }))
      flash(`${name} removed`)
    } else {
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    }
  }

  async function savePrizeSettings(groupId: number) {
    const s = prizeSettings[groupId]
    const total = s.prize_splits.reduce((sum, x) => sum + x.pct, 0)
    if (Math.abs(total - 100) > 0.01) {
      flash(`Splits must total 100% (currently ${total}%)`)
      return
    }
    const res = await fetch('/api/mod/group', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, ...s }),
    })
    if (res.ok) {
      flash('Prize settings saved')
    } else {
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    }
  }

  if (!groups.length) {
    return <p className="text-gray-400">No groups to manage.</p>
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="fixed top-4 right-4 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {msg}
        </div>
      )}

      {groups.map(g => {
        const isOpen = expanded.has(g.id)
        const members = membersByGroup[g.id]

        return (
          <div key={g.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleExpand(g.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm">{g.name}</span>
                <span className="text-xs text-gray-400 font-mono bg-gray-200 px-1.5 py-0.5 rounded shrink-0">
                  {g.code}
                </span>
                {members != null && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-xs ml-4 shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="divide-y divide-gray-100">
                {/* Prize Settings */}
                <div className="bg-white">
                  <button
                    onClick={() => setPrizeOpen(s => { const n = new Set(s); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n })}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prize Settings</span>
                    <span className="text-gray-400 text-xs">{prizeOpen.has(g.id) ? '▲' : '▼'}</span>
                  </button>
                  {prizeOpen.has(g.id) && (() => {
                    const ps = prizeSettings[g.id]
                    const group = groups.find(x => x.id === g.id)!
                    const paidCount = membersByGroup[g.id]?.filter(m => m.paid).length ?? 0
                    const membersLoaded = membersByGroup[g.id] != null
                    const gross = paidCount * ps.entry_fee
                    const platformCut = gross * (group.platform_fee_pct / 100)
                    const net = gross - platformCut
                    const splitTotal = ps.prize_splits.reduce((s, x) => s + x.pct, 0)
                    const splitsValid = Math.abs(splitTotal - 100) <= 0.01
                    return (
                      <div className="px-4 pb-4 space-y-4">
                        {/* Entry settings */}
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            Entry fee ($)
                            <input
                              type="number"
                              min={0}
                              step={5}
                              value={ps.entry_fee}
                              onChange={e => setPrizeSettings(s => ({ ...s, [g.id]: { ...s[g.id], entry_fee: +e.target.value } }))}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            Fee per
                            <select
                              value={ps.fee_per}
                              onChange={e => setPrizeSettings(s => ({ ...s, [g.id]: { ...s[g.id], fee_per: e.target.value as 'person' | 'bracket' } }))}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value="person">Person</option>
                              <option value="bracket">Bracket</option>
                            </select>
                          </label>
                        </div>

                        {/* Pool breakdown */}
                        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          <p className="font-semibold text-gray-500 uppercase tracking-wider mb-2">Pool Breakdown</p>
                          <div className="flex justify-between text-gray-600">
                            <span>{paidCount} paid {ps.fee_per === 'bracket' ? 'brackets' : 'members'} × ${ps.entry_fee}</span>
                            <span className="tabular-nums font-medium">${gross.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-400">
                            <span>Platform fee ({group.platform_fee_pct}%)</span>
                            <span className="tabular-nums">−${platformCut.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                            <span>Net prize pool</span>
                            <span className="tabular-nums text-[#cc0000]">${net.toFixed(2)}</span>
                          </div>
                          {!membersLoaded && (
                            <p className="text-gray-400 italic pt-1">Load members to see live amounts</p>
                          )}
                        </div>

                        {/* Prize splits */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">Prize Splits <span className="font-normal text-gray-400">(must total 100% of net pool)</span></p>
                          <div className="space-y-1.5">
                            {ps.prize_splits.map((split, i) => {
                              const amount = net * (split.pct / 100)
                              return (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-14 shrink-0">Place {split.place}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={split.pct}
                                    onChange={e => setPrizeSettings(s => {
                                      const splits = [...s[g.id].prize_splits]
                                      splits[i] = { ...splits[i], pct: +e.target.value }
                                      return { ...s, [g.id]: { ...s[g.id], prize_splits: splits } }
                                    })}
                                    className="w-14 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                  <span className="text-xs text-gray-500 tabular-nums ml-1 w-20">= ${amount.toFixed(2)}</span>
                                  <button
                                    onClick={() => setPrizeSettings(s => {
                                      const splits = s[g.id].prize_splits.filter((_, j) => j !== i)
                                        .map((x, j) => ({ ...x, place: j + 1 }))
                                      return { ...s, [g.id]: { ...s[g.id], prize_splits: splits } }
                                    })}
                                    className="text-xs text-red-400 hover:text-red-600 ml-auto"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )
                            })}
                            {/* Totals row */}
                            <div className="flex items-center gap-2 border-t border-gray-200 pt-1.5 mt-1">
                              <span className="text-xs text-gray-400 w-14 shrink-0">Total</span>
                              <span className={`text-xs font-bold w-14 text-center tabular-nums ${splitsValid ? 'text-green-600' : 'text-red-500'}`}>
                                {splitTotal}%
                              </span>
                              <span className="text-xs text-gray-400 ml-1 w-20">= ${net.toFixed(2)}</span>
                              {!splitsValid && (
                                <span className="text-xs text-red-500 ml-auto">{(100 - splitTotal).toFixed(1)}% unallocated</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setPrizeSettings(s => {
                              const splits = [...s[g.id].prize_splits, { place: s[g.id].prize_splits.length + 1, pct: 0 }]
                              return { ...s, [g.id]: { ...s[g.id], prize_splits: splits } }
                            })}
                            className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                          >
                            + Add place
                          </button>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => savePrizeSettings(g.id)}
                            className="bg-[#cc0000] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#a00000] transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Members */}
                <div className="divide-y divide-gray-50">
                {members == null ? (
                  <p className="text-sm text-gray-400 px-4 py-3">Loading…</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-3">No members yet.</p>
                ) : (
                  members.map(m => {
                    const profile = m.profiles as unknown as { display_name: string }
                    return (
                      <div key={m.user_id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                        <span className="flex-1 font-medium truncate min-w-0">
                          {profile?.display_name}
                        </span>
                        <button
                          onClick={() => togglePaid(g.id, m)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                            m.paid
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-green-400'
                          }`}
                        >
                          {m.paid ? 'Paid' : 'Unpaid'}
                        </button>
                        <button
                          onClick={() => toggleRole(g.id, m)}
                          disabled={m.user_id === currentUserId}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                            m.role === 'mod'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {m.role === 'mod' ? 'Mod' : 'Member'}
                        </button>
                        <button
                          onClick={() => removeMember(g.id, m)}
                          disabled={m.user_id === currentUserId}
                          className="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })
                )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
