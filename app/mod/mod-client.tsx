'use client'
import { useState, useEffect, useCallback } from 'react'

interface Group {
  id: number
  name: string
  code: string
  max_brackets_per_user: number | null
  max_members: number | null
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
            )}
          </div>
        )
      })}
    </div>
  )
}
