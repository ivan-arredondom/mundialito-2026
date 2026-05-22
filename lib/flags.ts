// Maps FIFA 3-letter team codes to ISO 3166-1 alpha-2 codes for flagcdn.com
const CODE_TO_ISO: Record<string, string> = {
  USA: 'us', PAN: 'pa', HAI: 'ht', JAM: 'jm',
  MEX: 'mx', BOL: 'bo', CAN: 'ca', NZL: 'nz',
  ARG: 'ar', CHI: 'cl', PER: 'pe', AUS: 'au',
  FRA: 'fr', MAR: 'ma', BEL: 'be', ESP: 'es',
  BRA: 'br', URU: 'uy', COL: 'co', ECU: 'ec',
  ENG: 'gb-eng', SER: 'rs', NED: 'nl', ISL: 'is',
  GER: 'de', JPN: 'jp', KOR: 'kr', SAU: 'sa',
  POR: 'pt', CZE: 'cz', TUR: 'tr', GRE: 'gr',
  NGA: 'ng', CIV: 'ci', SEN: 'sn', EGY: 'eg',
  CRO: 'hr', SVK: 'sk', ROM: 'ro', HUN: 'hu',
  MEX2: 'mx', QAT: 'qa', IRN: 'ir', IRQ: 'iq',
  CAM: 'cm', MLI: 'ml', GAB: 'ga', RSA: 'za',
}

export function flagSrc(teamCode: string): string | null {
  const iso = CODE_TO_ISO[teamCode]
  return iso ? `https://flagcdn.com/w20/${iso}.png` : null
}
