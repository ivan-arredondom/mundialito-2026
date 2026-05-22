// Static FIFA WC2026 knockout bracket structure.
// Slot labels: '1A'–'1L' = group winners, '2A'–'2L' = runners-up,
// '3rd-1'–'3rd-8' = the 8 best 3rd-place teams ranked by pts/GD/GF.

// R32 match_number → [slot_a, slot_b]
export const R32_SLOTS: Record<number, [string, string]> = {
  73: ['1A', '2D'],
  74: ['1B', '2C'],
  75: ['1E', '2F'],
  76: ['1F', '2E'],
  77: ['1C', '2B'],
  78: ['1D', '2A'],
  79: ['3rd-1', '3rd-2'],
  80: ['3rd-3', '3rd-4'],
  81: ['1G', '2J'],
  82: ['1H', '2K'],
  83: ['1K', '2H'],
  84: ['1L', '2I'],
  85: ['1I', '2L'],
  86: ['1J', '2G'],
  87: ['3rd-5', '3rd-6'],
  88: ['3rd-7', '3rd-8'],
}

// Knockout match_number → [feed_a_match_number, feed_b_match_number]
// For THIRD (#103), feed matches supply the LOSERS (see THIRD_MATCH_NUMBER).
export const KNOCKOUT_FEEDS: Record<number, [number, number]> = {
  89:  [73,  74],
  90:  [75,  76],
  91:  [77,  78],
  92:  [79,  80],
  93:  [81,  82],
  94:  [83,  84],
  95:  [85,  86],
  96:  [87,  88],
  97:  [89,  90],
  98:  [91,  92],
  99:  [93,  94],
  100: [95,  96],
  101: [97,  98],
  102: [99,  100],
  103: [101, 102],  // 3rd-place match uses SF *losers*
  104: [101, 102],  // Final uses SF *winners*
}

// Match that uses the *loser* of its feeder matches instead of the winner.
export const THIRD_MATCH_NUMBER = 103

export const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const
export type GroupCode = typeof GROUP_CODES[number]

// Ordered knockout stages as they appear in the tab bar.
export const KNOCKOUT_STAGES = [
  { key: 'R32',   label: 'R32',   matchNumbers: [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88] },
  { key: 'R16',   label: 'R16',   matchNumbers: [89,90,91,92,93,94,95,96] },
  { key: 'QF',    label: 'QF',    matchNumbers: [97,98,99,100] },
  { key: 'SF',    label: 'SF',    matchNumbers: [101,102] },
  { key: 'THIRD', label: '3RD',   matchNumbers: [103] },
  { key: 'FINAL', label: 'FINAL', matchNumbers: [104] },
] as const
