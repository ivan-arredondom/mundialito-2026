import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const MEDALS = ['🥇', '🥈', '🥉']

type RawBracket = {
  id: string
  name: string
  user_id: string
  created_at: string
  profiles: { display_name: string } | null
  bracket_scores: { points: number }[] | null
}

type RawMember = {
  user_id: string
  profiles: { display_name: string } | null
}

type Bracket = {
  id: string
  display_name: string
  user_id: string
  bracket_name: string
  points: number
  created_at: string
  group_name: string | null
}

type RankedBracket = Bracket & { rank: number }

function buildRanked(
  rawBrackets: RawBracket[],
  groupByUser: Record<string, string | null> = {}
): RankedBracket[] {
  const brackets: Bracket[] = rawBrackets.map(b => ({
    id: b.id,
    display_name: b.profiles?.display_name ?? 'Unknown',
    user_id: b.user_id,
    bracket_name: b.name,
    points: b.bracket_scores?.[0]?.points ?? 0,
    created_at: b.created_at,
    group_name: groupByUser[b.user_id] ?? null,
  }))

  brackets.sort((a, b) =>
    b.points - a.points ||
    a.display_name.localeCompare(b.display_name) ||
    a.created_at.localeCompare(b.created_at)
  )

  const ranked: RankedBracket[] = []
  for (let i = 0; i < brackets.length; i++) {
    const rank = i > 0 && brackets[i].points === brackets[i - 1].points
      ? ranked[i - 1].rank
      : i + 1
    ranked.push({ ...brackets[i], rank })
  }
  return ranked
}

function RankedTable({ ranked, showGroupCol }: { ranked: RankedBracket[]; showGroupCol: boolean }) {
  if (ranked.length === 0) {
    return <p className="text-gray-400 text-center py-8">No submissions yet.</p>
  }
  return (
    <>
      <div className={`grid ${showGroupCol ? 'grid-cols-[2rem_1fr_1fr_1fr_auto]' : 'grid-cols-[2rem_1fr_1fr_auto]'} gap-x-3 px-4 mb-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold`}>
        <span />
        <span>Player</span>
        {showGroupCol && <span>Group</span>}
        <span>Submission</span>
        <span className="text-right">Pts</span>
      </div>
      <div className="space-y-1">
        {ranked.map(b => (
          <div
            key={b.id}
            className={`grid ${showGroupCol ? 'grid-cols-[2rem_1fr_1fr_1fr_auto]' : 'grid-cols-[2rem_1fr_1fr_auto]'} gap-x-3 items-center px-4 py-3 rounded-xl ${
              b.rank === 1 && b.points > 0 ? 'bg-[#f5c518]/10 border border-[#f5c518]/40' :
              b.rank === 2 && b.points > 0 ? 'bg-gray-100' :
              b.rank === 3 && b.points > 0 ? 'bg-orange-50' : 'bg-gray-50'
            }`}
          >
            <span className="text-center text-sm">
              {b.points > 0 && b.rank <= 3
                ? MEDALS[b.rank - 1]
                : <span className="font-black text-gray-300 text-xs tabular-nums">{b.rank}</span>
              }
            </span>
            <span className="font-semibold text-sm truncate">{b.display_name}</span>
            {showGroupCol && (
              <span className="text-xs text-gray-400 truncate">{b.group_name ?? '—'}</span>
            )}
            <span className="text-sm text-gray-500 truncate">{b.bracket_name}</span>
            <span className="font-black text-[#cc0000] tabular-nums text-right">{b.points}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  type MyGroup = { id: number; name: string }
  let myGroups: MyGroup[] = []

  if (user) {
    const { data: memberships } = await supabase
      .from('group_memberships')
      .select('group_id, groups(name)')
      .eq('user_id', user.id)
    myGroups = (memberships ?? []).map(m => ({
      id: m.group_id as number,
      name: (m.groups as unknown as { name: string } | null)?.name ?? 'My Group',
    }))
  }

  const activeTab = (myGroups.length === 0 || tab === 'global') ? 'global' : 'group'
  const baseSelect = 'id, name, user_id, created_at, profiles(display_name), bracket_scores(points)'

  // Global tab
  let globalRanked: RankedBracket[] = []
  if (activeTab === 'global') {
    const [{ data: rawBrackets }, { data: allMemberships }] = await Promise.all([
      admin.from('brackets').select(baseSelect).order('created_at', { ascending: true }),
      admin.from('group_memberships').select('user_id, groups(name, show_in_global)'),
    ])

    const userGroupMap: Record<string, { name: string; visible: boolean }[]> = {}
    for (const m of allMemberships ?? []) {
      const g = m.groups as unknown as { name: string; show_in_global: boolean } | null
      if (!userGroupMap[m.user_id]) userGroupMap[m.user_id] = []
      if (g) userGroupMap[m.user_id].push({ name: g.name, visible: g.show_in_global })
    }

    const hiddenUserIds = new Set(
      Object.entries(userGroupMap)
        .filter(([, groups]) => groups.length > 0 && groups.every(g => !g.visible))
        .map(([userId]) => userId)
    )

    const groupByUser: Record<string, string | null> = {}
    for (const [userId, groups] of Object.entries(userGroupMap)) {
      const visible = groups.find(g => g.visible)
      groupByUser[userId] = visible?.name ?? groups[0]?.name ?? null
    }

    const visibleBrackets = (rawBrackets ?? []).filter(b => !hiddenUserIds.has(b.user_id))
    globalRanked = buildRanked(visibleBrackets as unknown as RawBracket[], groupByUser)
  }

  // Group tab — one ranked list per group, stacked
  type GroupBoard = { groupId: number; groupName: string; ranked: RankedBracket[]; noSubmissionUsers: string[] }
  let groupBoards: GroupBoard[] = []
  if (activeTab === 'group') {
    groupBoards = await Promise.all(
      myGroups.map(async ({ id: groupId, name: groupName }) => {
        const { data: memberData } = await admin
          .from('group_memberships')
          .select('user_id, profiles(display_name)')
          .eq('group_id', groupId)
        const members = (memberData ?? []) as unknown as RawMember[]
        const memberIds = members.map(m => m.user_id)

        const { data: rawBrackets } = await admin
          .from('brackets')
          .select(baseSelect)
          .in('user_id', memberIds)
          .order('created_at', { ascending: true })

        const ranked = buildRanked((rawBrackets ?? []) as unknown as RawBracket[])
        const usersWithBrackets = new Set(ranked.map(b => b.user_id))
        const noSubmissionUsers = members
          .filter(m => !usersWithBrackets.has(m.user_id))
          .map(m => (m.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown')
          .sort()

        return { groupId, groupName, ranked, noSubmissionUsers }
      })
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-black mb-6">Leaderboard</h1>

      {/* Tabs — only shown when user is in a group */}
      {myGroups.length > 0 && (
        <div className="flex gap-6 mb-8 border-b border-gray-200">
          <Link
            href="/leaderboard"
            className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'group'
                ? 'border-[#cc0000] text-[#cc0000]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {myGroups.length === 1 ? myGroups[0].name : 'My Groups'}
          </Link>
          <Link
            href="/leaderboard?tab=global"
            className={`pb-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'global'
                ? 'border-[#cc0000] text-[#cc0000]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Global
          </Link>
        </div>
      )}

      {activeTab === 'global' ? (
        globalRanked.length === 0
          ? <p className="text-gray-400 text-center py-16">No submissions yet.</p>
          : <RankedTable ranked={globalRanked} showGroupCol />
      ) : (
        <div className="space-y-10">
          {groupBoards.map(({ groupId, groupName, ranked, noSubmissionUsers }) => (
            <div key={groupId}>
              {groupBoards.length > 1 && (
                <h2 className="text-base font-black mb-4 text-gray-700 border-b pb-2">{groupName}</h2>
              )}
              <RankedTable ranked={ranked} showGroupCol={false} />
              {noSubmissionUsers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
                    No submissions yet
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {noSubmissionUsers.map(name => (
                      <span key={name} className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
