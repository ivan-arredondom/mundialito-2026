import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  let groupId: number | null = null
  let groupName: string | null = null
  let noSubmissionUsers: string[] = []

  if (user) {
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('group_id, groups(name)')
      .eq('user_id', user.id)
      .single()
    if (membership) {
      groupId = membership.group_id as number
      groupName = (membership.groups as unknown as { name: string } | null)?.name ?? null
    }
  }

  let members: RawMember[] = []

  if (groupId) {
    const { data } = await admin
      .from('group_memberships')
      .select('user_id, profiles(display_name)')
      .eq('group_id', groupId)
    members = (data ?? []) as unknown as RawMember[]
  }

  const memberIds = members.map(m => m.user_id)

  const baseQuery = admin
    .from('brackets')
    .select('id, name, user_id, created_at, profiles(display_name), bracket_scores(points)')
    .order('created_at', { ascending: true })

  const { data: rawBrackets } = await (
    memberIds.length > 0 ? baseQuery.in('user_id', memberIds) : baseQuery
  )

  const brackets = ((rawBrackets ?? []) as unknown as RawBracket[]).map(b => ({
    id: b.id,
    display_name: b.profiles?.display_name ?? 'Unknown',
    user_id: b.user_id,
    bracket_name: b.name,
    points: b.bracket_scores?.[0]?.points ?? 0,
    created_at: b.created_at,
  }))

  brackets.sort((a, b) =>
    b.points - a.points ||
    a.display_name.localeCompare(b.display_name) ||
    a.created_at.localeCompare(b.created_at)
  )

  const ranked: (typeof brackets[0] & { rank: number })[] = []
  for (let i = 0; i < brackets.length; i++) {
    const rank = i > 0 && brackets[i].points === brackets[i - 1].points
      ? ranked[i - 1].rank
      : i + 1
    ranked.push({ ...brackets[i], rank })
  }

  if (groupId) {
    const usersWithBrackets = new Set(brackets.map(b => b.user_id))
    noSubmissionUsers = members
      .filter(m => !usersWithBrackets.has(m.user_id))
      .map(m => m.profiles?.display_name ?? 'Unknown')
      .sort()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-black mb-1">Leaderboard</h1>
      <p className="text-sm text-gray-500 mb-8">{groupName ?? ''}</p>

      {ranked.length === 0 ? (
        <p className="text-gray-400 text-center py-16">No submissions yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-x-3 px-4 mb-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            <span />
            <span>Player</span>
            <span>Submission</span>
            <span className="text-right">Pts</span>
          </div>

          <div className="space-y-1">
            {ranked.map((b) => (
              <div
                key={b.id}
                className={`grid grid-cols-[2rem_1fr_1fr_auto] gap-x-3 items-center px-4 py-3 rounded-xl ${
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
                <span className="text-sm text-gray-500 truncate">{b.bracket_name}</span>
                <span className="font-black text-[#cc0000] tabular-nums text-right">{b.points}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {noSubmissionUsers.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
            No submissions yet
          </h2>
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
  )
}
