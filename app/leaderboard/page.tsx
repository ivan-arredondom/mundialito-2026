import { createClient } from '@/lib/supabase/server'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('leaderboard')
    .select('bracket_id, display_name, bracket_name, points, rank')
    .order('rank', { ascending: true })
    .limit(200)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-black mb-8 md:mb-10">Leaderboard</h1>
      {!rows?.length ? (
        <p className="text-gray-400 text-center py-20">
          No scores yet — predictions lock June 11, 2026.
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div
              key={r.bracket_id}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                i === 0 ? 'bg-[#f5c518]/10 border border-[#f5c518]/40' :
                i === 1 ? 'bg-gray-100' :
                i === 2 ? 'bg-orange-50' : ''
              }`}
            >
              <span
                className={`font-black text-lg w-8 text-center ${
                  i === 0 ? 'text-[#f5c518]' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-orange-400' : 'text-gray-300'
                }`}
              >
                {r.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.display_name}</p>
                <p className="text-xs text-gray-400 truncate">{r.bracket_name}</p>
              </div>
              <span className="font-black text-xl text-[#cc0000] tabular-nums">{r.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
