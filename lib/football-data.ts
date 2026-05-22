const BASE = 'https://api.football-data.org/v4'
const KEY = process.env.FOOTBALL_DATA_API_KEY!

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Auth-Token': KEY },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`football-data API ${res.status}: ${path}`)
  return res.json()
}

export interface FDMatch {
  id: number
  stage: string
  group: string | null
  utcDate: string
  status: string
  homeTeam: { id: number; tla: string; name: string }
  awayTeam: { id: number; tla: string; name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}

export async function fetchWC2026Matches(): Promise<FDMatch[]> {
  const data = await apiFetch('/competitions/WC/matches?season=2026')
  return data.matches as FDMatch[]
}
