// src/components/MatchSummary.tsx
import React from "react";
import { Heart, AlertTriangle, CheckCircle2, Info, Star } from "lucide-react";

type AnyRec = Record<string, any>;

function pct(score?: number, max?: number) {
  if (!Number.isFinite(score!) || !Number.isFinite(max!) || !max) return undefined;
  return Math.round((Number(score) / Number(max)) * 100);
}

function Badge({
  tone = "info",
  children,
}: {
  tone?: "good" | "average" | "bad" | "info";
  children: React.ReactNode;
}) {
  const map: AnyRec = {
    good: "bg-emerald-50 text-emerald-800 border-emerald-200",
    average: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-rose-50 text-rose-800 border-rose-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };
  
  const iconMap = {
    good: <CheckCircle2 className="h-3.5 w-3.5" />,
    average: <Info className="h-3.5 w-3.5" />,
    bad: <AlertTriangle className="h-3.5 w-3.5" />,
    info: <Info className="h-3.5 w-3.5" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${map[tone]}`}>
      {iconMap[tone]}
      {children}
    </span>
  );
}

function FieldRow({ label, left, right }: { label: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-sm font-semibold text-gray-900 text-center">{left ?? "—"}</div>
      <div className="text-sm font-semibold text-gray-900 text-center">{right ?? "—"}</div>
    </div>
  );
}

function ScoreCard({ score, max, percentage, tone }: { score?: number; max?: number; percentage?: number; tone: string }) {
  const progressTone =
    tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-rose-500" : tone === "average" ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-600">COMPATIBILITY SCORE</div>
        {percentage !== undefined && (
          <div className="text-lg font-bold text-gray-800">{percentage}%</div>
        )}
      </div>
      
      <div className="flex items-end gap-2 mb-3">
        <div className="text-3xl font-black text-gray-900">
          {Number.isFinite(score) ? score : "—"}
        </div>
        <div className="text-lg text-gray-500 mb-1">/ {Number.isFinite(max) ? max : "—"}</div>
      </div>
      
      <div className="h-3 rounded-full bg-gray-300 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-out ${progressTone}`}
          style={{ width: `${Math.max(0, Math.min(100, percentage ?? 0))}%` }}
        />
      </div>
    </div>
  );
}

function ProfileCard({ type, nak, rasi }: { type: "Boy" | "Girl"; nak?: string; rasi?: string }) {
  const colors = type === "Boy" ? "from-blue-50 to-indigo-50 border-blue-200" : "from-pink-50 to-rose-50 border-pink-200";
  const iconColor = type === "Boy" ? "text-blue-600" : "text-pink-600";

  return (
    <div className={`bg-gradient-to-br ${colors} rounded-xl p-4 border ${colors.split(' ')[2]}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${iconColor} bg-current`} />
        <div className="text-sm font-semibold text-gray-700">{type}</div>
      </div>
      
      <div className="space-y-2">
        {nak && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Nakshatra</span>
            <span className="text-sm font-semibold text-gray-900">{nak}</span>
          </div>
        )}
        {rasi && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Rasi</span>
            <span className="text-sm font-semibold text-gray-900">{rasi}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MatchSummary({ data }: { data: any }) {
  if (!data) return null;

  const root = data?.data ?? data;
  const boy = root?.boy_info ?? {};
  const girl = root?.girl_info ?? {};

  const boyNak = boy?.nakshatra?.name;
  const boyRasi = boy?.rasi?.name;
  const girlNak = girl?.nakshatra?.name;
  const girlRasi = girl?.rasi?.name;

  const kootBoy = boy?.koot ?? {};
  const kootGirl = girl?.koot ?? {};

  const score = root?.guna_milan?.total_points ?? root?.guna_milan?.obtained_points ?? root?.obtained_points;
  const max = root?.guna_milan?.maximum_points ?? root?.guna_milan?.total_points ?? root?.total_points ?? 36;
  const percentage = pct(score, max);

  const msgType = (root?.message?.type as string) || "info";
  const msgDesc = root?.message?.description as string | undefined;

  const tone =
    msgType === "good" ? "good" : msgType === "bad" ? "bad" : msgType === "average" ? "average" : "info";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">Kundli Matching</div>
            <div className="text-sm text-gray-500">Ashta Koota Compatibility Analysis</div>
          </div>
        </div>
        <Badge tone={tone as any}>
          {msgType === "good" ? "Auspicious" : msgType === "bad" ? "Inauspicious" : msgType === "average" ? "Moderate" : "Analysis"}
        </Badge>
      </div>

      {/* Score Card */}
      <ScoreCard score={score} max={max} percentage={percentage} tone={tone} />

      {/* Summary message */}
      {msgDesc && (
        <div className="rounded-xl border border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-500" />
            <div className="text-sm font-semibold text-gray-700">Compatibility Summary</div>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">{msgDesc}</div>
        </div>
      )}

      {/* Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileCard type="Boy" nak={boyNak} rasi={boyRasi} />
        <ProfileCard type="Girl" nak={girlNak} rasi={girlRasi} />
      </div>

      {/* Koota matrix */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            <div className="text-sm font-semibold text-gray-700">Ashta Koota Factors</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-3 gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
            <div>Factor</div>
            <div className="text-center">Boy</div>
            <div className="text-center">Girl</div>
          </div>
          
          <FieldRow label="Varna" left={kootBoy.varna} right={kootGirl.varna} />
          <FieldRow label="Vasya" left={kootBoy.vasya} right={kootGirl.vasya} />
          <FieldRow label="Tara" left={kootBoy.tara} right={kootGirl.tara} />
          <FieldRow label="Yoni" left={kootBoy.yoni} right={kootGirl.yoni} />
          <FieldRow label="Graha Maitri" left={kootBoy.graha_maitri} right={kootGirl.graha_maitri} />
          <FieldRow label="Gana" left={kootBoy.gana} right={kootGirl.gana} />
          <FieldRow label="Bhakoot" left={kootBoy.bhakoot} right={kootGirl.bhakoot} />
          <FieldRow label="Nadi" left={kootBoy.nadi} right={kootGirl.nadi} />
        </div>
      </div>
    </div>
  );
}