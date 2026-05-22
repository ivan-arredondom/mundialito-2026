import { THIRD_MATCH_NUMBER } from './bracket-structure'

export type ScorePrediction = {
  match_id: number
  home_score: number
  away_score: number
}

export type GroupStanding = {
  team_id: number
  rank: 1 | 2 | 3 | 4
  pts: number
  gd: number
  gf: number
}

export type GroupMatch = {
  id: number
  group_code: string
  home_team_id: number
  away_team_id: number
}

export type KnockoutMatch = {
  id: number
  match_number: number
  stage: string
  slot_a: string | null
  slot_b: string | null
  feed_a_match_id: number | null
  feed_b_match_id: number | null
  kickoff_at?: string | null
}

export function predictGroupStandings(
  scores: ScorePrediction[],
  matches: GroupMatch[],
  _teams: { id: number }[]
): Record<string, GroupStanding[]> {
  const scoreByMatchId = new Map(scores.map(s => [s.match_id, s]))

  const matchesByGroup: Record<string, GroupMatch[]> = {}
  for (const m of matches) {
    if (!matchesByGroup[m.group_code]) matchesByGroup[m.group_code] = []
    matchesByGroup[m.group_code].push(m)
  }

  const result: Record<string, GroupStanding[]> = {}

  for (const [group, groupMatches] of Object.entries(matchesByGroup)) {
    const teamIds = new Set<number>()
    for (const m of groupMatches) {
      teamIds.add(m.home_team_id)
      teamIds.add(m.away_team_id)
    }

    const stats: Record<number, { pts: number; gd: number; gf: number }> = {}
    for (const tid of teamIds) stats[tid] = { pts: 0, gd: 0, gf: 0 }

    for (const m of groupMatches) {
      const pred = scoreByMatchId.get(m.id)
      if (!pred || pred.home_score == null || pred.away_score == null) continue
      const h = pred.home_score, a = pred.away_score

      stats[m.home_team_id].gf += h
      stats[m.home_team_id].gd += h - a
      stats[m.away_team_id].gf += a
      stats[m.away_team_id].gd += a - h

      if (h > a) stats[m.home_team_id].pts += 3
      else if (h === a) { stats[m.home_team_id].pts += 1; stats[m.away_team_id].pts += 1 }
      else stats[m.away_team_id].pts += 3
    }

    function h2hBetween(xId: number, yId: number): { ptsX: number; gdX: number } {
      let ptsX = 0, gdX = 0
      for (const m of groupMatches) {
        const pred = scoreByMatchId.get(m.id)
        if (!pred || pred.home_score == null || pred.away_score == null) continue
        const h = pred.home_score, a = pred.away_score
        if (m.home_team_id === xId && m.away_team_id === yId) {
          gdX += h - a
          if (h > a) ptsX += 3
          else if (h === a) ptsX += 1
        } else if (m.home_team_id === yId && m.away_team_id === xId) {
          gdX += a - h
          if (a > h) ptsX += 3
          else if (a === h) ptsX += 1
        }
      }
      return { ptsX, gdX }
    }

    const teamIdList = Array.from(teamIds)
    teamIdList.sort((x, y) => {
      if (stats[y].pts !== stats[x].pts) return stats[y].pts - stats[x].pts
      if (stats[y].gd !== stats[x].gd) return stats[y].gd - stats[x].gd
      if (stats[y].gf !== stats[x].gf) return stats[y].gf - stats[x].gf
      const hx = h2hBetween(x, y)
      const hy = h2hBetween(y, x)
      // hy.ptsX - hx.ptsX: negative when x has more h2h pts → x first (descending)
      if (hy.ptsX !== hx.ptsX) return hy.ptsX - hx.ptsX
      // hy.gdX = -hx.gdX for a single-match h2h; hy.gdX - hx.gdX = -2*hx.gdX → negative when x has +gd
      if (hy.gdX !== hx.gdX) return hy.gdX - hx.gdX
      return x - y
    })

    result[group] = teamIdList.map((tid, idx) => ({
      team_id: tid,
      rank: (idx + 1) as 1 | 2 | 3 | 4,
      pts: stats[tid].pts,
      gd: stats[tid].gd,
      gf: stats[tid].gf,
    }))
  }

  return result
}

export function predictBestThirds(
  standings: Record<string, GroupStanding[]>
): number[] {
  const thirds: GroupStanding[] = []
  for (const groupStandings of Object.values(standings)) {
    const third = groupStandings.find(s => s.rank === 3)
    if (third) thirds.push(third)
  }
  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.team_id - b.team_id
  })
  return thirds.slice(0, 8).map(s => s.team_id)
}

// Resolves '1A', '2B', '3rd-3', etc. to a team_id or null (TBD)
export function resolveSlot(
  slot: string,
  standings: Record<string, GroupStanding[]>,
  bestThirds: number[]
): number | null {
  const rankMatch = slot.match(/^([12])([A-L])$/)
  if (rankMatch) {
    const rank = parseInt(rankMatch[1]) as 1 | 2
    const group = rankMatch[2]
    return standings[group]?.find(s => s.rank === rank)?.team_id ?? null
  }
  const thirdMatch = slot.match(/^3rd-(\d+)$/)
  if (thirdMatch) {
    return bestThirds[parseInt(thirdMatch[1]) - 1] ?? null
  }
  return null
}

export function resolveKnockoutTeams(
  match: KnockoutMatch,
  allKnockoutMatches: KnockoutMatch[],
  standings: Record<string, GroupStanding[]>,
  bestThirds: number[],
  winnerPicks: Record<number, number>
): { teamA: number | null; teamB: number | null } {
  const matchesById = new Map(allKnockoutMatches.map(m => [m.id, m]))
  const memo = new Map<number, { teamA: number | null; teamB: number | null }>()
  return resolveById(match, matchesById, standings, bestThirds, winnerPicks, memo)
}

function resolveById(
  match: KnockoutMatch,
  matchesById: Map<number, KnockoutMatch>,
  standings: Record<string, GroupStanding[]>,
  bestThirds: number[],
  winnerPicks: Record<number, number>,
  memo: Map<number, { teamA: number | null; teamB: number | null }>
): { teamA: number | null; teamB: number | null } {
  if (memo.has(match.id)) return memo.get(match.id)!

  let result: { teamA: number | null; teamB: number | null }

  if (match.slot_a != null && match.slot_b != null) {
    result = {
      teamA: resolveSlot(match.slot_a, standings, bestThirds),
      teamB: resolveSlot(match.slot_b, standings, bestThirds),
    }
  } else if (match.feed_a_match_id != null && match.feed_b_match_id != null) {
    const feedA = matchesById.get(match.feed_a_match_id) ?? null
    const feedB = matchesById.get(match.feed_b_match_id) ?? null

    if (match.match_number === THIRD_MATCH_NUMBER) {
      const resolvedA = feedA ? resolveById(feedA, matchesById, standings, bestThirds, winnerPicks, memo) : null
      const resolvedB = feedB ? resolveById(feedB, matchesById, standings, bestThirds, winnerPicks, memo) : null
      result = {
        teamA: feedA ? loser(feedA.id, resolvedA, winnerPicks) : null,
        teamB: feedB ? loser(feedB.id, resolvedB, winnerPicks) : null,
      }
    } else {
      result = {
        teamA: feedA ? (winnerPicks[feedA.id] ?? null) : null,
        teamB: feedB ? (winnerPicks[feedB.id] ?? null) : null,
      }
    }
  } else {
    result = { teamA: null, teamB: null }
  }

  memo.set(match.id, result)
  return result
}

function loser(
  matchId: number,
  resolved: { teamA: number | null; teamB: number | null } | null,
  winnerPicks: Record<number, number>
): number | null {
  if (!resolved) return null
  const winner = winnerPicks[matchId]
  if (winner == null) return null
  if (resolved.teamA === winner) return resolved.teamB
  if (resolved.teamB === winner) return resolved.teamA
  return null
}

export function findConflicts(
  knockoutMatches: KnockoutMatch[],
  winnerPicks: Record<number, number>,
  standings: Record<string, GroupStanding[]>,
  bestThirds: number[]
): Array<{ matchId: number; matchNumber: number; stage: string; reason: string }> {
  const matchesById = new Map(knockoutMatches.map(m => [m.id, m]))
  const memo = new Map<number, { teamA: number | null; teamB: number | null }>()
  const conflicts: Array<{ matchId: number; matchNumber: number; stage: string; reason: string }> = []

  for (const match of knockoutMatches) {
    const winner = winnerPicks[match.id]
    if (winner == null) continue

    const resolved = resolveById(match, matchesById, standings, bestThirds, winnerPicks, memo)
    if (resolved.teamA !== winner && resolved.teamB !== winner) {
      conflicts.push({
        matchId: match.id,
        matchNumber: match.match_number,
        stage: match.stage,
        reason: `Saved pick is no longer one of the two teams in this match`,
      })
    }
  }

  return conflicts
}
