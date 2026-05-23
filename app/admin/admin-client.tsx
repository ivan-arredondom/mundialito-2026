'use client'
import React, { useState, useEffect } from 'react'

interface Settings {
  allow_registrations: boolean
  max_brackets_per_user: number
}

interface Group {
  id: number
  name: string
  code: string
  max_brackets_per_user: number | null
  max_members: number | null
  platform_fee_pct: number
  show_in_global: boolean
}

interface Member {
  user_id: string
  role: string
  joined_at: string
  profiles: { display_name: string }
}

interface UserRow {
  id: string
  display_name: string
  is_admin: boolean
  is_global_mod: boolean
  created_at: string
  group_memberships: { role: string; groups: { name: string; code: string } }[]
}

export default function AdminClient({
  initialSettings,
  initialGroups,
  currentUserId,
  initialMyGroupIds,
}: {
  initialSettings: Settings
  initialGroups: Group[]
  currentUserId: string
  initialMyGroupIds: number[]
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [groups, setGroups] = useState(initialGroups)
  const [users, setUsers] = useState<UserRow[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCode, setNewGroupCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null)
  const [membersByGroup, setMembersByGroup] = useState<Record<number, Member[]>>({})
  const [expandedUserGroups, setExpandedUserGroups] = useState<Set<string>>(new Set())
  const [myGroupIds, setMyGroupIds] = useState<Set<number>>(new Set(initialMyGroupIds))

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers)
  }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  async function toggleMembers(groupId: number) {
    if (expandedGroup === groupId) { setExpandedGroup(null); return }
    setExpandedGroup(groupId)
    if (!membersByGroup[groupId]) {
      const res = await fetch(`/api/admin/members?group_id=${groupId}`)
      const data = await res.json()
      setMembersByGroup(m => ({ ...m, [groupId]: data }))
    }
  }

  async function removeMember(groupId: number, userId: string) {
    await fetch('/api/admin/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: userId }),
    })
    setMembersByGroup(m => ({
      ...m,
      [groupId]: m[groupId].filter(x => x.user_id !== userId),
    }))
    flash('Member removed')
  }

  async function toggleMemberRole(groupId: number, member: Member) {
    const next = member.role === 'mod' ? 'member' : 'mod'
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, user_id: member.user_id, role: next }),
    })
    if (res.ok) {
      setMembersByGroup(m => ({
        ...m,
        [groupId]: m[groupId].map(x => x.user_id === member.user_id ? { ...x, role: next } : x),
      }))
      flash(`Role updated to ${next}`)
    }
  }

  async function patchSettings(patch: Partial<Settings>) {
    setSettings(s => ({ ...s, ...patch }))
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    flash('Settings saved')
  }

  async function createGroup() {
    if (!newGroupName || !newGroupCode) return
    setSaving(true)
    const res = await fetch('/api/admin/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName, code: newGroupCode }),
    })
    const data = await res.json()
    if (res.ok) {
      setGroups(g => [...g, data])
      setNewGroupName('')
      setNewGroupCode('')
      flash('Group created')
    } else {
      flash(`Error: ${data.error}`)
    }
    setSaving(false)
  }

  async function deleteGroup(id: number) {
    await fetch('/api/admin/groups', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setGroups(g => g.filter(x => x.id !== id))
    if (expandedGroup === id) setExpandedGroup(null)
    flash('Group deleted')
  }

  async function joinGroup(id: number) {
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: id }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyGroupIds(s => new Set([...s, id]))
      flash('Joined group')
    } else {
      flash(`Error: ${data.error}`)
    }
  }

  async function patchGroup(id: number, patch: { max_brackets_per_user?: number | null; max_members?: number | null; platform_fee_pct?: number; show_in_global?: boolean }) {
    const res = await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    const data = await res.json()
    if (res.ok) {
      setGroups(g => g.map(x => x.id === id ? { ...x, ...patch } : x))
      flash('Group updated')
    } else {
      flash(`Error: ${data.error}`)
    }
  }

  async function toggleAdmin(user: UserRow) {
    const next = !user.is_admin
    setUsers(u => u.map(x => x.id === user.id ? { ...x, is_admin: next } : x))
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_admin: next }),
    })
    if (!res.ok) {
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_admin: !next } : x))
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    } else {
      flash(`${user.display_name} ${next ? 'granted' : 'revoked'} admin`)
    }
  }

  async function toggleGlobalMod(user: UserRow) {
    const next = !user.is_global_mod
    setUsers(u => u.map(x => x.id === user.id ? { ...x, is_global_mod: next } : x))
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, is_global_mod: next }),
    })
    if (!res.ok) {
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_global_mod: !next } : x))
      const json = await res.json().catch(() => ({}))
      flash(`Error: ${json.error ?? res.status}`)
    } else {
      flash(`${user.display_name} ${next ? 'made' : 'removed as'} global mod`)
    }
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete "${user.display_name}" permanently? This cannot be undone.`)) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers(u => u.filter(x => x.id !== user.id))
      flash(`${user.display_name} deleted`)
    } else {
      flash(`Error: ${data.error}`)
    }
  }

  return (
    <div className="space-y-12">
      {msg && (
        <div className="fixed top-4 right-4 bg-black text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {msg}
        </div>
      )}

      {/* Results Sync */}
      <section>
        <h2 className="text-lg font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
          Results
        </h2>
        <SyncButton onFlash={flash} />
      </section>

      {/* Global Settings */}
      <section>
        <h2 className="text-lg font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
          Global Settings
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between max-w-sm">
            <span className="font-medium text-sm">Allow new registrations</span>
            <button
              onClick={() => patchSettings({ allow_registrations: !settings.allow_registrations })}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                settings.allow_registrations ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 mt-1 rounded-full bg-white shadow transition-transform ${
                settings.allow_registrations ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </label>
          <label className="flex items-center gap-4 max-w-sm">
            <span className="font-medium text-sm">Max brackets per user</span>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.max_brackets_per_user}
              onChange={e => setSettings(s => ({ ...s, max_brackets_per_user: +e.target.value }))}
              onBlur={() => patchSettings({ max_brackets_per_user: settings.max_brackets_per_user })}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
            />
          </label>
        </div>
      </section>

      {/* Groups */}
      <section>
        <h2 className="text-lg font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
          Groups
        </h2>
        <div className="space-y-3 mb-6">
          {groups.map(g => (
            <div key={g.id} className="border border-gray-100 rounded-lg overflow-hidden">
              {/* Group header row */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-sm">{g.name}</span>
                    <span className="ml-2 text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {g.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const next = !g.show_in_global
                        setGroups(gs => gs.map(x => x.id === g.id ? { ...x, show_in_global: next } : x))
                        patchGroup(g.id, { show_in_global: next })
                      }}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        g.show_in_global
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}
                    >
                      {g.show_in_global ? 'Global ✓' : 'Hidden'}
                    </button>
                    <button
                      onClick={() => toggleMembers(g.id)}
                      className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                    >
                      {expandedGroup === g.id ? 'Hide members' : 'Members'}
                    </button>
                    {!myGroupIds.has(g.id) && (
                      <button
                        onClick={() => joinGroup(g.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Join
                      </button>
                    )}
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    Max brackets/user
                    <input
                      type="number"
                      min={1}
                      max={20}
                      placeholder={String(settings.max_brackets_per_user)}
                      value={g.max_brackets_per_user ?? ''}
                      onChange={e => setGroups(gs => gs.map(x => x.id === g.id
                        ? { ...x, max_brackets_per_user: e.target.value === '' ? null : +e.target.value }
                        : x
                      ))}
                      onBlur={() => patchGroup(g.id, { max_brackets_per_user: g.max_brackets_per_user })}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                    />
                    <span className="text-gray-400">(global: {settings.max_brackets_per_user})</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    Max members
                    <input
                      type="number"
                      min={1}
                      placeholder="∞"
                      value={g.max_members ?? ''}
                      onChange={e => setGroups(gs => gs.map(x => x.id === g.id
                        ? { ...x, max_members: e.target.value === '' ? null : +e.target.value }
                        : x
                      ))}
                      onBlur={() => patchGroup(g.id, { max_members: g.max_members })}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                    />
                    <span className="text-gray-400">(blank = unlimited)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    Platform fee %
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={g.platform_fee_pct ?? 5}
                      onChange={e => setGroups(gs => gs.map(x => x.id === g.id
                        ? { ...x, platform_fee_pct: +e.target.value }
                        : x
                      ))}
                      onBlur={() => patchGroup(g.id, { platform_fee_pct: g.platform_fee_pct })}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm"
                    />
                    <span className="text-gray-400">(max 10%)</span>
                  </label>
                </div>
              </div>

              {/* Expandable members list */}
              {expandedGroup === g.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                  {!membersByGroup[g.id] ? (
                    <p className="text-xs text-gray-400 py-2">Loading…</p>
                  ) : membersByGroup[g.id].length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">No members yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {membersByGroup[g.id].map(m => {
                        const profile = m.profiles as unknown as { display_name: string }
                        return (
                          <div key={m.user_id} className="flex items-center gap-2 py-1 text-sm">
                            <span className="flex-1 font-medium">{profile?.display_name}</span>
                            <button
                              onClick={() => toggleMemberRole(g.id, m)}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                m.role === 'mod'
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              {m.role === 'mod' ? 'Mod' : 'Member'}
                            </button>
                            <button
                              onClick={() => removeMember(g.id, m.user_id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create group form */}
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Group name</label>
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="San Diego Pool"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Invite code</label>
            <input
              value={newGroupCode}
              onChange={e => setNewGroupCode(e.target.value)}
              placeholder="SanDiego"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[#cc0000]"
            />
          </div>
          <button
            onClick={createGroup}
            disabled={saving || !newGroupName || !newGroupCode}
            className="bg-[#cc0000] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#a00000] disabled:opacity-40 transition-colors"
          >
            Create
          </button>
        </div>
      </section>

      {/* Users */}
      <section>
        <h2 className="text-lg font-black uppercase tracking-widest text-gray-500 mb-4 border-b pb-2">
          Users
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Loading users…</p>
        ) : (
          <UsersByGroup
            users={users}
            currentUserId={currentUserId}
            expandedUserGroups={expandedUserGroups}
            setExpandedUserGroups={setExpandedUserGroups}
            onToggleGlobalMod={toggleGlobalMod}
            onToggleAdmin={toggleAdmin}
            onDelete={deleteUser}
          />
        )}
      </section>
    </div>
  )
}

function UserRow({
  u,
  isSelf,
  onToggleGlobalMod,
  onToggleAdmin,
  onDelete,
}: {
  u: UserRow
  isSelf: boolean
  onToggleGlobalMod: (u: UserRow) => void
  onToggleAdmin: (u: UserRow) => void
  onDelete: (u: UserRow) => void
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 text-sm">
      <span className="flex-1 font-semibold min-w-0 truncate">{u.display_name}</span>
      <button
        onClick={() => onToggleGlobalMod(u)}
        disabled={isSelf}
        className={`text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
          u.is_global_mod
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-blue-300'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        Global Mod
      </button>
      <button
        onClick={() => onToggleAdmin(u)}
        disabled={isSelf}
        className={`text-xs px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
          u.is_admin
            ? 'bg-[#cc0000] text-white border-[#cc0000]'
            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-[#cc0000]'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        Admin
      </button>
      <button
        onClick={() => onDelete(u)}
        disabled={isSelf}
        className="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  )
}

function UsersByGroup({
  users,
  currentUserId,
  expandedUserGroups,
  setExpandedUserGroups,
  onToggleGlobalMod,
  onToggleAdmin,
  onDelete,
}: {
  users: UserRow[]
  currentUserId: string
  expandedUserGroups: Set<string>
  setExpandedUserGroups: React.Dispatch<React.SetStateAction<Set<string>>>
  onToggleGlobalMod: (u: UserRow) => void
  onToggleAdmin: (u: UserRow) => void
  onDelete: (u: UserRow) => void
}) {
  const grouped: Record<string, UserRow[]> = {}
  const ungrouped: UserRow[] = []

  for (const u of users) {
    const membership = u.group_memberships?.[0]
    const groupName = membership
      ? (membership.groups as unknown as { name: string })?.name ?? 'Unknown'
      : null
    if (groupName) {
      ;(grouped[groupName] ??= []).push(u)
    } else {
      ungrouped.push(u)
    }
  }

  const groupNames = Object.keys(grouped).sort()

  function toggleGroup(key: string) {
    setExpandedUserGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function GroupSection({ label, members }: { label: string; members: UserRow[] }) {
    const open = expandedUserGroups.has(label)
    return (
      <div className="border border-gray-100 rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => toggleGroup(label)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <span className="text-sm font-semibold">{label}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{members.length} user{members.length !== 1 ? 's' : ''}</span>
            <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
          </div>
        </button>
        {open && (
          <div className="px-4 divide-y divide-gray-50">
            {members.map(u => (
              <UserRow
                key={u.id}
                u={u}
                isSelf={u.id === currentUserId}
                onToggleGlobalMod={onToggleGlobalMod}
                onToggleAdmin={onToggleAdmin}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {groupNames.map(name => (
        <GroupSection key={name} label={name} members={grouped[name]} />
      ))}
      {ungrouped.length > 0 && (
        <GroupSection label="Ungrouped" members={ungrouped} />
      )}
    </div>
  )
}

function SyncButton({ onFlash }: { onFlash: (msg: string) => void }) {
  const [syncing, setSyncing] = useState(false)

  async function sync() {
    setSyncing(true)
    const res = await fetch('/api/results/sync', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSyncing(false)
    if (res.ok) {
      onFlash(`Synced — ${data.updated ?? 0} match${data.updated !== 1 ? 'es' : ''} updated`)
    } else {
      onFlash(`Sync failed: ${data.error ?? res.status}`)
    }
  }

  return (
    <button
      onClick={sync}
      disabled={syncing}
      className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 4v5h.582M20 20v-5h-.581M4.582 9a8 8 0 0 1 14.9-2.215M19.419 15a8 8 0 0 1-14.9 2.215" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {syncing ? 'Syncing…' : 'Sync Results'}
    </button>
  )
}
