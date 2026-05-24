import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Auto-injected by the Supabase Functions runtime.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Set via: supabase secrets set BSD_API_KEY=<token> FOOTBALL_DATA_API_KEY=<token>
const BSD_TOKEN = Deno.env.get('BSD_API_KEY') ?? ''
const FD_TOKEN = Deno.env.get('FOOTBALL_DATA_API_KEY') ?? ''

const BSD_BASE = 'https://sports.bzzoiro.com/api/v2'
const FD_BASE = 'https://api.football-data.org/v4'
const BSD_LEAGUE_ID = 27
const BSD_SEASON_ID = 188 // World Cup 2026

// ─── Shared row shape ────────────────────────────────────────────────────────

interface MatchScoreRow {
  event_id: string
  match_id: number | null
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  home_score_ht: number | null
  away_score_ht: number | null
  status: string
  period: string | null
  current_minute: number | null
  group_name: string | null
  round: string | null
  event_date: string
  last_updated: string | null
  data_source: string
  synced_at: string
}

// ─── BSD helpers ─────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function bsdGet(path: string): Promise<any> {
  const res = await fetch(`${BSD_BASE}${path}`, {
    headers: { Authorization: `Token ${BSD_TOKEN}` },
  })
  if (!res.ok) throw new Error(`BSD ${res.status}: ${path}`)
  return res.json()
}

// deno-lint-ignore no-explicit-any
function normalizeBSD(e: any, source: 'bsd_live' | 'bsd'): MatchScoreRow {
  const rawStatus: string = e.status ?? 'notstarted'
  const status =
    rawStatus === 'inprogress' ? 'IN_PLAY'
    : rawStatus === 'finished' ? 'FINISHED'
    : 'SCHEDULED'

  return {
    event_id: `bsd_${e.id}`,
    match_id: null,
    home_team: e.home_team ?? '',
    away_team: e.away_team ?? '',
    home_score: e.home_score ?? null,
    away_score: e.away_score ?? null,
    home_score_ht: e.home_score_ht ?? null,
    away_score_ht: e.away_score_ht ?? null,
    status,
    period: (e.period as string) || null,
    current_minute: e.current_minute ?? null,
    group_name: (e.group_name as string) || null,
    round: (e.round_name as string) || (e.round_number ? String(e.round_number) : null),
    event_date: e.event_date,
    last_updated: (e.last_updated as string) ?? null,
    data_source: source,
    synced_at: new Date().toISOString(),
  }
}

async function fetchBSD(): Promise<MatchScoreRow[]> {
  const map = new Map<string, MatchScoreRow>()

  // 1. Live endpoint — real-time scores; filter to WC2026 league
  const liveData = await bsdGet('/events/live/')
  for (const e of (liveData.events ?? [])) {
    if (e.league_id === BSD_LEAGUE_ID) {
      map.set(String(e.id), normalizeBSD(e, 'bsd_live'))
    }
  }

  // 2. All WC2026 events (paginated) — non-live entries fill the rest
  let nextPath: string | null = `/events/?league_id=${BSD_LEAGUE_ID}&limit=100`
  while (nextPath) {
    const page = await bsdGet(nextPath)
    for (const e of (page.results ?? [])) {
      // Only WC 2026 season; skip placeholder-team-only knockout stubs
      if (e.season_id !== BSD_SEASON_ID) continue
      if (!map.has(String(e.id))) {
        map.set(String(e.id), normalizeBSD(e, 'bsd'))
      }
    }
    // next is an absolute URL; strip base to get just the path+query
    nextPath = page.next
      ? (page.next as string).replace(BSD_BASE, '')
      : null
  }

  return Array.from(map.values())
}

// ─── Football-data fallback ───────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function fdGet(path: string): Promise<any> {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { 'X-Auth-Token': FD_TOKEN },
  })
  if (!res.ok) throw new Error(`FD ${res.status}: ${path}`)
  return res.json()
}

const FD_STATUS: Record<string, string> = {
  SCHEDULED: 'SCHEDULED', TIMED: 'SCHEDULED',
  IN_PLAY: 'IN_PLAY', PAUSED: 'IN_PLAY',
  FINISHED: 'FINISHED',
}
const FD_STAGE: Record<string, string> = {
  GROUP_STAGE: 'Group Stage', LAST_32: 'Round of 32', LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarterfinals', SEMI_FINALS: 'Semifinals',
  THIRD_PLACE: '3rd Place', FINAL: 'Final',
}

// deno-lint-ignore no-explicit-any
function normalizeFD(m: any): MatchScoreRow {
  const status = FD_STATUS[m.status] ?? 'SCHEDULED'
  return {
    event_id: `fd_${m.id}`,
    match_id: null,
    home_team: m.homeTeam?.shortName ?? m.homeTeam?.name ?? '',
    away_team: m.awayTeam?.shortName ?? m.awayTeam?.name ?? '',
    home_score: status === 'FINISHED' ? (m.score?.fullTime?.home ?? null) : null,
    away_score: status === 'FINISHED' ? (m.score?.fullTime?.away ?? null) : null,
    home_score_ht: m.score?.halfTime?.home ?? null,
    away_score_ht: m.score?.halfTime?.away ?? null,
    status,
    period: null,
    current_minute: null,
    group_name: m.group ?? null,
    round: FD_STAGE[m.stage] ?? m.stage ?? null,
    event_date: m.utcDate,
    last_updated: null,
    data_source: 'football-data',
    synced_at: new Date().toISOString(),
  }
}

async function fetchFD(): Promise<MatchScoreRow[]> {
  const data = await fdGet('/competitions/WC/matches?season=2026')
  return (data.matches ?? []).map(normalizeFD)
}

// ─── match_id resolution ──────────────────────────────────────────────────────

// Build a lookup: "YYYY-MM-DD_lowercasedHomeName" → matches.id
// Works once BSD has real team names (during tournament).
// Returns empty map when team names are still placeholders (e.g. "W101").
async function buildMatchLookup(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('matches')
    .select('id, kickoff_at, home_team:teams!matches_home_team_id_fkey(name)')

  const lookup = new Map<string, number>()
  for (const m of (data ?? [])) {
    const day = new Date(m.kickoff_at).toISOString().slice(0, 10)
    const homeName = (m.home_team as { name: string } | null)?.name?.toLowerCase()
    if (homeName && !homeName.startsWith('w') && !homeName.startsWith('l')) {
      // Skip placeholder names like "W101", "L102"
      lookup.set(`${day}_${homeName}`, m.id)
    }
  }
  return lookup
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let rows: MatchScoreRow[] = []
  let source = 'bsd'

  // Try BSD first; fall back to football-data
  try {
    rows = await fetchBSD()
    console.log(`BSD: fetched ${rows.length} WC2026 events`)
  } catch (err) {
    console.warn('BSD failed, falling back to football-data:', err)
    source = 'football-data'
    try {
      rows = await fetchFD()
      console.log(`FD fallback: fetched ${rows.length} matches`)
    } catch (fdErr) {
      console.error('Both APIs failed:', fdErr)
      return new Response(
        JSON.stringify({ error: 'All APIs failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ upserted: 0, total: 0, source }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Resolve match_id for rows where team names are real (not placeholders)
  const matchLookup = await buildMatchLookup(supabase)
  for (const row of rows) {
    const day = new Date(row.event_date).toISOString().slice(0, 10)
    const homeKey = `${day}_${row.home_team.toLowerCase()}`
    const matchId = matchLookup.get(homeKey)
    if (matchId) row.match_id = matchId
  }

  // Upsert in batches of 50
  const BATCH = 50
  let upserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('match_scores')
      .upsert(batch, { onConflict: 'event_id' })
    if (error) {
      console.error('Upsert error:', error)
    } else {
      upserted += batch.length
    }
  }

  // Also update matches table (status + scores) so bracket scoring stays current.
  // Only applies when match_id is resolved (real team names available).
  const linked = rows.filter(r => r.match_id !== null)
  for (const row of linked) {
    if (row.status === 'FINISHED' || row.status === 'IN_PLAY') {
      await supabase
        .from('matches')
        .update({
          status: row.status,
          home_score: row.home_score,
          away_score: row.away_score,
        })
        .eq('id', row.match_id!)
    }
  }

  return new Response(
    JSON.stringify({ upserted, total: rows.length, linked: linked.length, source }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
