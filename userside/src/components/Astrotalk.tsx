// src/components/AstrologersHub.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Star, Clock, MessageCircle, ChevronRight,
  BadgePercent, Flower2, Calendar, Heart, MapPin, Users
} from "lucide-react";
import { ASTROLOGERS } from "./astrologers";
import Navbar from "./Navbar";

// services (make sure these are exported from ../services/astro)
import {
  geocodePlace,
  fetchKundli,
  fetchPanchang,
  matchKundli,
  toISO,
  todayISO,
} from "../services/astro";

// pretty cards
import KundliSummary from "../components/KundliSummary";
import PanchangCard from "../components/PanchangCard";
import MatchSummary from "../components/MatchSummary";

export default function AstrologersHub() {
  const [selected, setSelected] = useState<string | null>(ASTROLOGERS[0].id);
  const active = useMemo(() => ASTROLOGERS.find((a) => a.id === selected)!, [selected]);

  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const FeaturePill = ({
    children,
    icon: Icon,
  }: {
    children: React.ReactNode;
    icon: any;
  }) => (
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium">
      <Icon className="h-4 w-4 text-orange-500" />
      {children}
    </div>
  );

  // -------------------- Kundli (Boy) --------------------
  const [bDD, setBDD] = useState("");
  const [bMM, setBMM] = useState("");
  const [bYYYY, setBYYYY] = useState("");
  const [bHH, setBHH] = useState("");
  const [bMin, setBMin] = useState("");
  const [bSS, setBSS] = useState("");
  const [bPlace, setBPlace] = useState("");

  const [boyLoading, setBoyLoading] = useState(false);
  const [boyError, setBoyError] = useState<string | null>(null);
  const [boyRes, setBoyRes] = useState<any>(null);
  const [boyCoords, setBoyCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [boyDT, setBoyDT] = useState<string>("");

  async function handleKundliBoy() {
    setBoyLoading(true);
    setBoyError(null);
    setBoyRes(null);
    try {
      if (!bDD || !bMM || !bYYYY || !bHH || !bMin || !bSS || !bPlace)
        throw new Error("Fill all Boy fields");
      const dt = toISO(bYYYY, bMM, bDD, bHH, bMin, bSS);
      const coords = await geocodePlace(bPlace);
      const res = await fetchKundli({ datetime: dt, coords });
      setBoyDT(dt);
      setBoyCoords(coords);
      setBoyRes(res);
    } catch (e: any) {
      setBoyError(e.message || "Failed to generate");
    } finally {
      setBoyLoading(false);
    }
  }

  // -------------------- Kundli (Girl) --------------------
  const [gDD, setGDD] = useState("");
  const [gMM, setGMM] = useState("");
  const [gYYYY, setGYYYY] = useState("");
  const [gHH, setGHH] = useState("");
  const [gMin, setGMin] = useState("");
  const [gSS, setGSS] = useState("");
  const [gPlace, setGPlace] = useState("");

  const [girlLoading, setGirlLoading] = useState(false);
  const [girlError, setGirlError] = useState<string | null>(null);
  const [girlRes, setGirlRes] = useState<any>(null);
  const [girlCoords, setGirlCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [girlDT, setGirlDT] = useState<string>("");

  async function handleKundliGirl() {
    setGirlLoading(true);
    setGirlError(null);
    setGirlRes(null);
    try {
      if (!gDD || !gMM || !gYYYY || !gHH || !gMin || !gSS || !gPlace)
        throw new Error("Fill all Girl fields");
      const dt = toISO(gYYYY, gMM, gDD, gHH, gMin, gSS);
      const coords = await geocodePlace(gPlace);
      const res = await fetchKundli({ datetime: dt, coords });
      setGirlDT(dt);
      setGirlCoords(coords);
      setGirlRes(res);
    } catch (e: any) {
      setGirlError(e.message || "Failed to generate");
    } finally {
      setGirlLoading(false);
    }
  }

  // -------------------- Matching (uses above Boy/Girl) --------------------
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchRes, setMatchRes] = useState<any>(null);

  async function handleMatch() {
    setMatchLoading(true);
    setMatchError(null);
    setMatchRes(null);
    try {
      if (!boyDT || !boyCoords || !girlDT || !girlCoords) {
        throw new Error("Generate both Boy & Girl Kundli (date/time/place) first.");
      }
      // Service maps to boy_dob / girl_dob internally
      const res = await matchKundli({
        boy_datetime: boyDT,
        boy_coords: boyCoords!,
        girl_datetime: girlDT,
        girl_coords: girlCoords!,
        ayanamsa: 1,
      });
      setMatchRes(res);
    } catch (e: any) {
      setMatchError(e.message || "Failed to match");
    } finally {
      setMatchLoading(false);
    }
  }

  // -------------------- Panchang --------------------
  const [pPlace, setPPlace] = useState("New Delhi, India");
  const [pDate, setPDate] = useState(todayISO());
  const [pTime, setPTime] = useState("06:00"); // HH:MM
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const [pRes, setPRes] = useState<any>(null);

  async function handlePanchang() {
    setPLoading(true);
    setPError(null);
    setPRes(null);
    try {
      const coords = await geocodePlace(pPlace);
      // service builds datetime + ayanamsa
      const res = await fetchPanchang({
        date: pDate,
        coords,
        time: `${pTime}:00`,
      });
      setPRes(res);
    } catch (e: any) {
      setPError(e.message || "Failed to fetch panchang");
    } finally {
      setPLoading(false);
    }
  }

  const requestDateTimeForPanchang = `${pDate}T${pTime}:00+05:30`;

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-[#FAF7F2] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-orange-100 rounded-full text-orange-700 text-sm font-medium">
              <Flower2 className="h-4 w-4" />
              VEDIC WISDOM • SPIRITUAL GUIDANCE
            </div>
            <h1 className="text-4xl font-bold text-orange-600 mb-4">Divine Astrologers</h1>
            <p className="text-orange-600 text-lg max-w-2xl mx-auto">
              Connect with certified Vedic astrologers for personalized spiritual guidance and life insights
            </p>
          </div>

          {/* Astrologer Selection */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Astrologer</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {ASTROLOGERS.map((astrologer) => (
                  <button
                    key={astrologer.id}
                    onClick={() => setSelected(astrologer.id)}
                    className={`shrink-0 text-center group transition-all ${
                      selected === astrologer.id ? "scale-105" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all ${
                        selected === astrologer.id
                          ? "border-orange-500 shadow-lg"
                          : "border-gray-200 group-hover:border-orange-300"
                      }`}
                    >
                      <img src={astrologer.img} alt={astrologer.name} className="w-full h-full object-cover" />
                      {astrologer.offer && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">%</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1 w-24">{astrologer.name}</div>
                      <div className="text-xs text-orange-600 font-semibold">{money(astrologer.rate)}/min</div>
                      <div className="text-[11px] text-gray-500">{astrologer.exp} yrs exp</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Astrologer Card */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                <div className="relative flex-shrink-0">
                  <img
                    src={active.img}
                    alt={active.name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-orange-100"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {active.exp}y
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <h2 className="text-xl font-bold text-gray-900">{active.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {money(active.rate)}/min
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {active.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        2.1k+ clients
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">{active.shortDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Vedic Astrology</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Life Guidance</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Relationship</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <Link
                    to={`/chat/${active.id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    <MessageCircle className="h-4 w-4" /> Start Chat
                  </Link>
                  <Link
                    to={`/post/${active.id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Profile <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Grid: Kundli (Boy/Girl), Panchang */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Vedic Astrology Tools</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kundli (Boy) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Flower2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Kundli — Boy</h3>
                    <p className="text-sm text-gray-600">Generate birth chart</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="DD" className="rounded-lg px-3 py-2 border text-center" value={bDD} onChange={(e) => setBDD(e.target.value)} />
                    <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={bMM} onChange={(e) => setBMM(e.target.value)} />
                    <input placeholder="YYYY" className="rounded-lg px-3 py-2 border text-center" value={bYYYY} onChange={(e) => setBYYYY(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="HH" className="rounded-lg px-3 py-2 border text-center" value={bHH} onChange={(e) => setBHH(e.target.value)} />
                    <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={bMin} onChange={(e) => setBMin(e.target.value)} />
                    <input placeholder="SS" className="rounded-lg px-3 py-2 border text-center" value={bSS} onChange={(e) => setBSS(e.target.value)} />
                  </div>
                  <input placeholder="Birth Place" className="w-full rounded-lg px-3 py-2 border" value={bPlace} onChange={(e) => setBPlace(e.target.value)} />
                  <button
                    onClick={handleKundliBoy}
                    disabled={boyLoading}
                    className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                  >
                    {boyLoading ? "Generating…" : "Generate Kundli (Boy)"}
                  </button>
                  {boyError && <div className="text-sm text-red-600">{boyError}</div>}
                  {boyRes && <KundliSummary data={boyRes} title="Kundli — Boy" />}
                </div>
              </div>

              {/* Kundli (Girl) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Flower2 className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Kundli — Girl</h3>
                    <p className="text-sm text-gray-600">Generate birth chart</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="DD" className="rounded-lg px-3 py-2 border text-center" value={gDD} onChange={(e) => setGDD(e.target.value)} />
                    <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={gMM} onChange={(e) => setGMM(e.target.value)} />
                    <input placeholder="YYYY" className="rounded-lg px-3 py-2 border text-center" value={gYYYY} onChange={(e) => setGYYYY(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input placeholder="HH" className="rounded-lg px-3 py-2 border text-center" value={gHH} onChange={(e) => setGHH(e.target.value)} />
                    <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={gMin} onChange={(e) => setGMin(e.target.value)} />
                    <input placeholder="SS" className="rounded-lg px-3 py-2 border text-center" value={gSS} onChange={(e) => setGSS(e.target.value)} />
                  </div>
                  <input placeholder="Birth Place" className="w-full rounded-lg px-3 py-2 border" value={gPlace} onChange={(e) => setGPlace(e.target.value)} />
                  <button
                    onClick={handleKundliGirl}
                    disabled={girlLoading}
                    className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
                  >
                    {girlLoading ? "Generating…" : "Generate Kundli (Girl)"}
                  </button>
                  {girlError && <div className="text-sm text-red-600">{girlError}</div>}
                  {girlRes && <KundliSummary data={girlRes} title="Kundli — Girl" />}
                </div>
              </div>

              {/* Panchang */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Panchang</h3>
                    <p className="text-sm text-gray-600">Place &amp; date specific details</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      className="rounded-lg px-3 py-2 border"
                      placeholder="Location (e.g., New Delhi, India)"
                      value={pPlace}
                      onChange={(e) => setPPlace(e.target.value)}
                    />
                    <input
                      type="date"
                      className="rounded-lg px-3 py-2 border"
                      value={pDate}
                      onChange={(e) => setPDate(e.target.value)}
                    />
                    <input
                      type="time"
                      className="rounded-lg px-3 py-2 border"
                      value={pTime}
                      onChange={(e) => setPTime(e.target.value)}
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-center text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    {pPlace} • {pDate} • {pTime}
                  </div>

                  <button
                    onClick={handlePanchang}
                    disabled={pLoading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    {pLoading ? "Loading…" : "Detailed Panchang"}
                  </button>

                  {pError && <div className="text-sm text-red-600">{pError}</div>}
                  {pRes && (
                    <PanchangCard
                      data={pRes}
                      heading="Panchang (Detailed)"
                      requestDateTime={requestDateTimeForPanchang}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Matching (uses generated Boy+Girl details) */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Kundli Matching</h3>
                  <p className="text-sm text-gray-600">Uses the Boy &amp; Girl details above</p>
                </div>
              </div>
              <button
                onClick={handleMatch}
                disabled={matchLoading}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
              >
                {matchLoading ? "Checking…" : "Check Compatibility"}
              </button>
              {matchError && <div className="text-sm text-red-600 mt-2">{matchError}</div>}
              {matchRes && (
                <div className="mt-3">
                  <MatchSummary data={matchRes} />
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Why Choose Our Astrologers</h3>
            <div className="flex flex-wrap justify-center gap-3">
              <FeaturePill icon={BadgePercent}>First Chat Discount</FeaturePill>
              <FeaturePill icon={Star}>Verified Advisors</FeaturePill>
              <FeaturePill icon={Clock}>24×7 Available</FeaturePill>
              <FeaturePill icon={Sparkles}>Vedic Certified</FeaturePill>
              <FeaturePill icon={Flower2}>Spiritual Guidance</FeaturePill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
