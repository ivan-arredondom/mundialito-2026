import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Determine group context
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

  // Fetch all brackets (scoped to group if applicable), bypassing RLS
  type RawBracket = {
    id: string
    name: string
    user_id: string
    created_at: string
    profiles: { display_name: string } | null
    bracket_scores: { points: number }[] | null
  }

  let query = admin
    .from('brackets')
    .select('id, name, user_id, created_at, profiles(display_name), bracket_scores(points)')
    .order('created_at', { ascending: true })

  let allMemberIds: string[] = []

  if (groupId) {
    const { data: members } = await admin
      .from('group_memberships')
      .select('user_id, profiles(display_name)')
      .eq('group_id', groupId)

    allMemberIds = (members ?? []).map(m => m.user_id)

    if (allMemberIds.length > 0) {
      query = query.in('user_id', allMemberIds) as typeof query
    }

    // Users with no submissions
    const { data: bracketsForMembers } = await admin
      .from('brackets')
      .select('user_id')
      .in('user_id', allMemberIds)

    const usersWithBrackets = new Set((bracketsForMembers ?? []).map(b => b.user_id))

    noSubmissionUsers = (members ?? [])
      .filter(m => !usersWithBrackets.has(m.user_id))
      .map(m => (m.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown')
      .sort()
  }

  const { data: rawBrackets } = await query

  const brackets = ((rawBrackets ?? []) as unknown as RawBracket[]).map(b => ({
    id: b.id,
    display_name: b.profiles?.display_name ?? 'Unknown',
    user_id: b.user_id,
    bracket_name: b.name,
    points: b.bracket_scores?.[0]?.points ?? 0,
    created_at: b.created_at,
  }))

  brackets.sort((a, b) => b.points - a.points || a.display_name.localeCompare(a.display_name) || a.created_at.localeCompare(b.created_at))

  // Assign ranks (tied points = same rank)
  const ranked: (typeof brackets[0] & { rank: number })[] = []
  for (let i = 0; i < brackets.length; i++) {
    const rank = (i > 0 && brackets[i].points === brackets[i - 1].points)
      ? ranked[i - 1].rank
      : i + 1
    ranked.push({ ...brackets[i], rank })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-black mb-1">Leaderboard</h1>
      {groupName && <p className="text-sm text-gray-500 mb-8">{groupName}</p>}
      {!groupName && <div className="mb-8" />}

      {ranked.length === 0 ? (
        <p className="text-gray-400 text-center py-16">No submissions yet.</p>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-x-3 px-4 mb-2 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
            <span></span>
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

      {/* Users with no submissions */}
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
