// Mirror of the SQL scoring logic for client-side previews.
// Authoritative points are computed by the database function.

export const STAGE_POINTS: Record<string, number> = {
  R32: 3,
  R16: 3,
  QF: 5,
  SF: 5,
  FINAL: 5,
  CHAMPION: 5,
}

export function scoreGroupMatch(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return 5
  const predictedResult = Math.sign(predicted.home - predicted.away)
  const actualResult = Math.sign(actual.home - actual.away)
  if (predictedResult === actualResult) return 3
  return 0
}

export function scoreAdvancement(stage: string, correct: boolean): number {
  if (!correct) return 0
  return STAGE_POINTS[stage] ?? 0
}
