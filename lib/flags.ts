// Maps FIFA 3-letter team codes to ISO 3166-1 alpha-2 codes for flagcdn.com
const CODE_TO_ISO: Record<string, string> = {
  // CONCACAF
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', HAI: 'ht', CUW: 'cw',
  // CONMEBOL
  ARG: 'ar', BRA: 'br', URY: 'uy', COL: 'co', ECU: 'ec', PAR: 'py',
  // UEFA
  FRA: 'fr', ESP: 'es', ENG: 'gb-eng', GER: 'de', POR: 'pt', NED: 'nl',
  BEL: 'be', CRO: 'hr', TUR: 'tr', CZE: 'cz', AUT: 'at', NOR: 'no',
  SUI: 'ch', SWE: 'se', SCO: 'gb-sct', BIH: 'ba',
  // AFC
  JPN: 'jp', KOR: 'kr', IRN: 'ir', IRQ: 'iq', KSA: 'sa', QAT: 'qa',
  AUS: 'au', NZL: 'nz', JOR: 'jo', UZB: 'uz',
  // CAF
  MAR: 'ma', SEN: 'sn', EGY: 'eg', CIV: 'ci', RSA: 'za', GHA: 'gh',
  ALG: 'dz', COD: 'cd', TUN: 'tn', CPV: 'cv',
}

export function flagSrc(teamCode: string): string | null {
  const iso = CODE_TO_ISO[teamCode]
  return iso ? `https://flagcdn.com/w20/${iso}.png` : null
}
