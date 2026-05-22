import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PrizeSplit = { place: number; pct: number }

type Group = {
  id: number
  name: string
  entry_fee: number
  fee_per: 'person' | 'bracket'
  platform_fee_pct: number
  prize_splits: PrizeSplit[]
}

type RawBracket = {
  id: string
  name: string
  user_id: string
  profiles: { display_name: string } | null
  bracket_scores: { points: number }[] | null
}

const PLACE_LABELS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th']
const MEDALS = ['', '🥇', '🥈', '🥉']

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default async function PrizesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  let groupId: number | null = null
  let isMod = false

  if (user) {
    const [{ data: membership }, { data: profile }] = await Promise.all([
      supabase.from('group_memberships')
        .select('group_id, role')
        .eq('user_id', user.id)
        .single(),
      supabase.from('profiles')
        .select('is_admin, is_global_mod')
        .eq('id', user.id)
        .single(),
    ])
    groupId = (membership?.group_id as number) ?? null
    isMod = !!(profile?.is_admin || profile?.is_global_mod || membership?.role === 'mod')
  }

  if (!groupId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-black mb-3">Prizes</h1>
        <p className="text-gray-400">
          {user ? "You're not in a group yet." : 'Sign in to see your group\'s prize pool.'}
        </p>
      </div>
    )
  }

  const [{ data: groupData }, { data: memberships }, { data: rawBrackets }] = await Promise.all([
    admin.from('groups')
      .select('id, name, entry_fee, fee_per, platform_fee_pct, prize_splits')
      .eq('id', groupId)
      .single(),
    admin.from('group_memberships')
      .select('user_id, paid')
      .eq('group_id', groupId),
    admin.from('brackets')
      .select('id, name, user_id, profiles(display_name), bracket_scores(points)')
      .in('user_id', [])  // placeholder — overridden below
      .order('created_at', { ascending: true }),
  ])

  const group = groupData as unknown as Group
  const members = memberships ?? []
  const memberIds = members.map(m => m.user_id)

  const { data: brackets } = await admin
    .from('brackets')
    .select('id, name, user_id, profiles(display_name), bracket_scores(points)')
    .in('user_id', memberIds)
    .order('created_at', { ascending: true })

  // Compute leaderboard for current leaders
  const entries = ((brackets ?? []) as unknown as RawBracket[]).map(b => ({
    display_name: b.profiles?.display_name ?? 'Unknown',
    user_id: b.user_id,
    bracket_name: b.name,
    points: b.bracket_scores?.[0]?.points ?? 0,
  }))
  entries.sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name))

  // Leaders per place (no ties — just show the top N distinct positions)
  const leaders: { display_name: string; bracket_name: string; points: number }[] = []
  const splits = group.prize_splits as PrizeSplit[]
  for (let i = 0; i < Math.min(entries.length, splits.length); i++) {
    leaders.push(entries[i])
  }

  // Prize pool computation
  const paidPersonCount = members.filter(m => m.paid).length
  const paidBracketCount = ((brackets ?? []) as unknown as RawBracket[])
    .filter(b => members.find(m => m.user_id === b.user_id && m.paid))
    .length

  const entryCount = group.fee_per === 'bracket' ? paidBracketCount : paidPersonCount
  const gross = entryCount * Number(group.entry_fee)
  const platformCut = gross * (Number(group.platform_fee_pct) / 100)
  const net = gross - platformCut

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-black mb-1">Prizes</h1>
      <p className="text-sm text-gray-500 mb-8">{group.name}</p>

      {/* Prize pool summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Prize Pool</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {entryCount} paid {group.fee_per === 'bracket' ? 'bracket' : 'entr'}{entryCount !== 1 ? (group.fee_per === 'bracket' ? 's' : 'ies') : 'y'} × {fmt(group.entry_fee)}
            </span>
            <span className="font-semibold tabular-nums">{fmt(gross)}</span>
          </div>
          {isMod && (
            <div className="flex justify-between text-gray-400">
              <span>Platform fee ({group.platform_fee_pct}%)</span>
              <span className="tabular-nums">−{fmt(platformCut)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="font-bold">Net prize pool</span>
            <span className="font-black text-[#cc0000] text-base tabular-nums">{fmt(net)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {paidPersonCount} of {members.length} members have paid
          {group.fee_per === 'bracket' && ` · ${paidBracketCount} paid brackets`}
        </p>
      </div>

      {/* Prize breakdown */}
      <div className="space-y-3">
        {splits.map((split, i) => {
          const amount = net * (split.pct / 100)
          const leader = leaders[i]
          const medal = MEDALS[split.place] ?? ''
          const label = PLACE_LABELS[split.place] ?? `${split.place}th`

          return (
            <div
              key={split.place}
              className={`border rounded-xl p-4 ${
                split.place === 1 ? 'border-[#f5c518]/40 bg-[#f5c518]/5' :
                split.place === 2 ? 'border-gray-200 bg-gray-50' :
                split.place === 3 ? 'border-orange-200 bg-orange-50' :
                'border-gray-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{medal || '🏆'}</span>
                  <div>
                    <p className="font-black text-sm">{label} Place</p>
                    <p className="text-xs text-gray-400">{split.pct}% of pool</p>
                  </div>
                </div>
                <span className="font-black text-xl tabular-nums text-[#cc0000] shrink-0">
                  {fmt(amount)}
                </span>
              </div>
              {leader && (
                <div className="mt-3 pt-3 border-t border-black/5 text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700">{leader.display_name}</span>
                  <span>·</span>
                  <span>{leader.bracket_name}</span>
                  <span>·</span>
                  <span>{leader.points} pts</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
