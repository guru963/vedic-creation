// src/components/PanchangCard.tsx
type Props = {
  data: any
  heading?: string
  requestDateTime?: string  // ISO with offset, e.g. "2025-10-07T06:00:00+05:30"
}

function pickActiveName(list: any[] | undefined, requestDT?: string) {
  if (!Array.isArray(list) || list.length === 0) return "—"
  if (!requestDT) return list[0]?.name ?? "—"
  const req = new Date(requestDT).getTime()
  const found = list.find((seg) => {
    const s = seg?.start ? new Date(seg.start).getTime() : NaN
    const e = seg?.end ? new Date(seg.end).getTime() : NaN
    return Number.isFinite(s) && Number.isFinite(e) && s <= req && req < e
  })
  return found?.name ?? (list[0]?.name ?? "—")
}

export default function PanchangCard({ data, heading = "Panchang", requestDateTime }: Props) {
  if (!data) return null
  const p = data?.data || {}

  // Arrays form (as in your sample):
  // p.tithi[] / p.nakshatra[] / p.karana[] / p.yoga[]
  const tithiName     = Array.isArray(p?.tithi)     ? pickActiveName(p.tithi, requestDateTime)     : (p?.tithi?.name ?? p?.tithi_name ?? "—")
  const nakshatraName = Array.isArray(p?.nakshatra) ? pickActiveName(p.nakshatra, requestDateTime) : (p?.nakshatra?.name ?? p?.nakshatra_name ?? "—")
  const yogaName      = Array.isArray(p?.yoga)      ? pickActiveName(p.yoga, requestDateTime)      : (p?.yoga?.name ?? p?.yoga_name ?? "—")
  const karanaName    = Array.isArray(p?.karana)    ? pickActiveName(p.karana, requestDateTime)    : (p?.karana?.name ?? p?.karan ?? p?.karana_name ?? "—")

  return (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="text-lg font-semibold">{heading}</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Tithi</div>
          <div className="font-medium">{tithiName}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Nakshatra</div>
          <div className="font-medium">{nakshatraName}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Yoga</div>
          <div className="font-medium">{yogaName}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Karana</div>
          <div className="font-medium">{karanaName}</div>
        </div>
      </div>

      {(p?.sunrise || p?.sunset) && (
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Sunrise / Sunset</div>
          <div className="text-sm text-gray-700">
            {p?.sunrise ? `Sunrise: ${p.sunrise}` : "Sunrise: —"} • {p?.sunset ? `Sunset: ${p.sunset}` : "Sunset: —"}
          </div>
        </div>
      )}
    </div>
  )
}
