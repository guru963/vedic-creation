import React from "react"

type Props = { data: any; title?: string }

export default function KundliSummary({ data, title = "Kundli Summary" }: Props) {
  if (!data) return null
  const n = data?.data?.nakshatra_details
  const dosha = data?.data?.mangal_dosha
  const yogas = data?.data?.yoga_details as Array<{ name: string; description: string }>

  return (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="text-lg font-semibold">{title}</div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Nakshatra</div>
          <div className="font-semibold">
            {n?.nakshatra?.name ?? "—"}{" "}
            {n?.nakshatra?.pada ? <span className="text-gray-500">(Pada {n.nakshatra.pada})</span> : null}
          </div>
          <div className="text-xs text-gray-600">
            Lord: {n?.nakshatra?.lord?.vedic_name || n?.nakshatra?.lord?.name || "—"}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Zodiac</div>
          <div className="font-semibold">{n?.zodiac?.name ?? "—"}</div>
          <div className="text-xs text-gray-600">
            Chandra Rāsi: {n?.chandra_rasi?.name ?? "—"} (Lord: {n?.chandra_rasi?.lord?.vedic_name || n?.chandra_rasi?.lord?.name || "—"})
          </div>
          <div className="text-xs text-gray-600">
            Sūrya Rāsi: {n?.soorya_rasi?.name ?? "—"} (Lord: {n?.soorya_rasi?.lord?.vedic_name || n?.soorya_rasi?.lord?.name || "—"})
          </div>
        </div>
      </div>

      {n?.additional_info && (
        <div className="rounded-lg border p-3">
          <div className="text-xs text-gray-500">Additional</div>
          <div className="text-sm text-gray-700 flex flex-wrap gap-2">
            <span>Deity: {n.additional_info.deity}</span>
            <span>• Gana: {n.additional_info.ganam}</span>
            <span>• Nadi: {n.additional_info.nadi}</span>
            <span>• Color: {n.additional_info.color}</span>
            <span>• Syllables: {n.additional_info.syllables}</span>
            <span>• Stone: {n.additional_info.birth_stone}</span>
          </div>
        </div>
      )}

      {dosha && (
        <div className={`rounded-lg p-3 border ${dosha.has_dosha ? "border-rose-300 bg-rose-50" : "border-green-300 bg-green-50"}`}>
          <div className="text-sm font-semibold">
            Mangal Dosha: {dosha.has_dosha ? "Present" : "Not Present"}
          </div>
          {dosha.description && <div className="text-sm text-gray-700 mt-1">{dosha.description}</div>}
        </div>
      )}

      {Array.isArray(yogas) && yogas.length > 0 && (
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">Yogas</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc pl-5">
            {yogas.map((y, i) => (
              <li key={i}>
                <span className="font-medium">{y.name}:</span> {y.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
