// src/services/astro.ts
export type Coords = { lat: number; lon: number }
export type DateISO = string
export type DateTimeISO = string

// Point this to your proxy (Supabase Edge Function / Cloudflare Worker / Miniflare)
const BASE = import.meta.env.VITE_PROKERALA_PROXY_URL || "http://localhost:8787"

// ---- tiny http helper ----
async function callProkerala<T>(op: string, params: Record<string, unknown>) {
  const r = await fetch(`${BASE}/api/prokerala`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, params }),
  })
  if (!r.ok) throw new Error(`Proxy error ${r.status}: ${await r.text()}`)
  return (await r.json()) as T
}

// ---- helpers ----
export async function geocodePlace(place: string): Promise<Coords> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`,
    { headers: { "Accept": "application/json" } }
  )
  if (!r.ok) throw new Error("Failed to geocode")
  const arr = await r.json()
  if (!arr.length) throw new Error("Place not found")
  return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) }
}

export const latLonString = (c: Coords) => `${c.lat},${c.lon}`

/**
 * Build an ISO 8601 string for a *local* datetime, converted to UTC (with Z).
 * Prokerala accepts this for Kundli/Matching.
 * Example input: toISO("1998","03","15","10","45","30") -> "1998-03-15T05:15:30.000Z" (depending on your local TZ)
 */


/** Today as "YYYY-MM-DD" for <input type="date" /> */
export function todayISO(): DateISO {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// Accept both "YYYY-MM-DD" and "DD-MM-YYYY"
export function parseLooseDate(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const m = input.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  throw new Error("Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY")
}

/** Build a fixed-offset datetime like "2025-10-07T06:00:00+05:30" (Prokerala Panchang requires offset form + ayanamsa) */
function buildZonedISO(dateYYYYMMDD: string, timeHHMMSS = "06:00:00", offset = "+05:30") {
  return `${dateYYYYMMDD}T${timeHHMMSS}${offset}`
}

// ---- API wrappers ----

/** Kundli (birth chart) */
export async function fetchKundli(opts: { datetime: DateTimeISO; coords: Coords; ayanamsa?: 1 | 3 | 5 }) {
  const { datetime, coords, ayanamsa = 1 } = opts
  return callProkerala("kundli", { datetime, ayanamsa, coordinates: latLonString(coords) })
}

/** Panchang (needs datetime with offset + ayanamsa) */
export async function fetchPanchang(opts: {
  date: DateISO | string
  coords: Coords
  time?: string        // "HH:MM:SS" (default 06:00:00)
  ayanamsa?: 1 | 3 | 5 // default 1 (Lahiri)
  tzOffset?: string    // default "+05:30"
}) {
  const { date, coords, time = "06:00:00", ayanamsa = 1, tzOffset = "+05:30" } = opts
  const ymd = parseLooseDate(String(date))
  const datetime = buildZonedISO(ymd, time, tzOffset)
  return callProkerala("panchang", { datetime, ayanamsa, coordinates: latLonString(coords) })
}

/** Kundli Matching */
// src/services/astro.ts

export async function matchKundli(opts: {
  boy_datetime: DateTimeISO; boy_coords: Coords
  girl_datetime: DateTimeISO; girl_coords: Coords
  ayanamsa?: 1 | 3 | 5
}) {
  const { boy_datetime, boy_coords, girl_datetime, girl_coords, ayanamsa = 1 } = opts

  // Prokerala expects boy_dob / girl_dob
  return callProkerala("match", {
    ayanamsa,
    boy_dob: boy_datetime,
    boy_coordinates: latLonString(boy_coords),
    girl_dob: girl_datetime,
    girl_coordinates: latLonString(girl_coords),
  })
}

// Shape your actual Prokerala outputs here.
// src/services/astro.ts (append near your other summarizers)

/**
 * Build a rich, compact summary from the Prokerala response shape used in KundliSummary.
 * Pulls: Zodiac, Chandra/Soorya rasi + lords, Nakshatra+pada+lord, Gana/Nadi/Color, Mangal dosha,
 * top 3 yogas, and current dasha if present (adjust field names if your payload differs).
 */
export function summarizeKundliForPromptProkerala(resp: any): string {
  if (!resp) return 'No chart.';

  const n = resp?.data?.nakshatra_details || {};
  const dosha = resp?.data?.mangal_dosha || {};
  const yogas = (resp?.data?.yoga_details || []) as Array<{ name?: string; description?: string }>;
  const dasha = resp?.data?.dasha?.current || resp?.data?.current_dasha || null;

  const nakName = n?.nakshatra?.name;
  const nakPada = n?.nakshatra?.pada ? ` (Pada ${n.nakshatra.pada})` : '';
  const nakLord = n?.nakshatra?.lord?.vedic_name || n?.nakshatra?.lord?.name;
  const zodiac = n?.zodiac?.name;
  const chandra = n?.chandra_rasi?.name;
  const chandraLord = n?.chandra_rasi?.lord?.vedic_name || n?.chandra_rasi?.lord?.name;
  const soorya = n?.soorya_rasi?.name;
  const sooryaLord = n?.soorya_rasi?.lord?.vedic_name || n?.soorya_rasi?.lord?.name;

  const add = n?.additional_info || {};
  const gana = add?.ganam, nadi = add?.nadi, color = add?.color, deity = add?.deity;

  const yogaList = yogas
    .map(y => y?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const dashaTxt = dasha?.name || dasha?.mahadasa || ''; // adjust if your payload uses different keys

  const parts = [
    zodiac ? `Zodiac:${zodiac}` : null,
    chandra ? `MoonRasi:${chandra}${chandraLord ? ` (Lord:${chandraLord})` : ''}` : null,
    soorya ? `SunRasi:${soorya}${sooryaLord ? ` (Lord:${sooryaLord})` : ''}` : null,
    nakName ? `Nakshatra:${nakName}${nakPada}${nakLord ? ` (Lord:${nakLord})` : ''}` : null,
    color ? `Color:${color}` : null,
    gana ? `Gana:${gana}` : null,
    nadi ? `Nadi:${nadi}` : null,
    deity ? `Deity:${deity}` : null,
    (dosha?.has_dosha === true || dosha?.has_dosha === false)
      ? `MangalDosha:${dosha.has_dosha ? 'Present' : 'NotPresent'}`
      : null,
    yogaList ? `Yogas:${yogaList}` : null,
    dashaTxt ? `CurrentDasha:${dashaTxt}` : null,
  ].filter(Boolean);

  return parts.join(' | ');
}


export function summarizePanchangForPrompt(p: any): string | undefined {
  if (!p) return undefined;
  const tithi = p?.tithi?.name || p?.tithi;
  const yoga = p?.yoga?.name || p?.yoga;
  const karana = p?.karana?.name || p?.karana;
  const nak = p?.nakshatra?.name || p?.nakshatra;
  return `Tithi:${tithi || 'NA'} | Yoga:${yoga || 'NA'} | Karana:${karana || 'NA'} | MoonNak:${nak || 'NA'}`;
}

// src/services/astro.ts

/**
 * Build an ISO 8601 string for a *local* datetime, converted to UTC (with Z),
 * and **without milliseconds** (Prokerala proxy requires HH:MM:SSZ).
 * Example: "1998-03-15T05:15:30Z"
 */
export function toISO(
  yyyy: string,
  mm: string,
  dd: string,
  hh: string,
  min: string,
  ss: string
): DateTimeISO {
  const p = (s: string) => s.padStart(2, "0")
  const local = `${yyyy}-${p(mm)}-${p(dd)}T${p(hh)}:${p(min)}:${p(ss)}`
  const d = new Date(local)

  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date/time. Check day/month ranges and use HH:MM:SS.")
  }

  // JS gives "...:SS.sssZ" — strip the millisecosummnds
  // e.g., 1998-03-15T05:15:30.000Z -> 1998-03-15T05:15:30Z
  return d.toISOString().replace(/\.\d{3}Z$/, "Z")
}
