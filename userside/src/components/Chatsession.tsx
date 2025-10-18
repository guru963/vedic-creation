// src/components/ChatSession.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Send, ArrowLeft, Sparkles, User, Bot } from "lucide-react";
import { ASTROLOGERS } from "./astrologers";

import { geocodePlace, fetchKundli, toISO } from "../services/astro";
import { askGeminiAstrology, type ChatTurn } from "../services/geminiService";
import { summarizeKundliForPromptProkerala } from "../services/astro";

// ✅ NEW: offline cascaded lists
import { Country, State, City, type ICountry, type IState, type ICity } from "country-state-city";

type Message = {
  id: string;
  sender: "user" | "astrologer";
  text: string;
  timestamp: number;
};

const gradient = "from-[#F53C44] via-[#FA7236] to-[#FA9F2C]";

const QUICK_QUESTIONS = [
  "How will my career be this year?",
  "What does my relationship outlook look like?",
  "Any health cautions I should be mindful of?",
  "Is this a good time for investments?",
  "What is my auspicious color today?",
  "Which areas should I focus on this month?"
];

// ------------- Birth Details Modal -------------
function BirthModal({
  open,
  onClose,
  onSubmit
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (args: {
    dd: string; mm: string; yyyy: string; hh: string; min: string; ss: string; place: string;
  }) => void;
}) {
  const [dd, setDD] = useState("");
  const [mm, setMM] = useState("");
  const [yyyy, setYYYY] = useState("");
  const [hh, setHH] = useState("");
  const [min, setMin] = useState("");
  const [ss, setSS] = useState("");

  // NEW: country/state/city dropdowns
  const [countries] = useState<ICountry[]>(Country.getAllCountries());
  const [countryCode, setCountryCode] = useState<string>("IN"); // default India
  const [states, setStates] = useState<IState[]>(State.getStatesOfCountry("IN"));
  const [stateCode, setStateCode] = useState<string>("");
  const [cities, setCities] = useState<ICity[]>([]);
  const [cityId, setCityId] = useState<string>("");

  // Optional: manual place input fallback
  const [manualPlace, setManualPlace] = useState("");

  useEffect(() => {
    // whenever country changes, reload states and clear state/city
    setStates(State.getStatesOfCountry(countryCode || ""));
    setStateCode("");
    setCities([]);
    setCityId("");
  }, [countryCode]);

  useEffect(() => {
    // whenever state changes, reload cities and clear city
    if (countryCode && stateCode) {
      setCities(City.getCitiesOfState(countryCode, stateCode));
    } else {
      setCities([]);
    }
    setCityId("");
  }, [countryCode, stateCode]);

  if (!open) return null;

  const selectedCountry = countries.find(c => c.isoCode === countryCode);
  const selectedState = states.find(s => s.isoCode === stateCode);
  const selectedCity = cities.find(c => c.name && c.name === cityId);

  const placeFromDropdowns = [
    selectedCity?.name,
    selectedState?.name,
    selectedCountry?.name
  ].filter(Boolean).join(", ");

  const finalPlace = manualPlace.trim() ? manualPlace.trim() : placeFromDropdowns;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Before we start</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please share your birth details so we can generate your kundli and personalize guidance.
        </p>

        <div className="space-y-4">
          {/* Date */}
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="DD" className="rounded-lg px-3 py-2 border text-center" value={dd} onChange={e=>setDD(e.target.value)} />
            <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={mm} onChange={e=>setMM(e.target.value)} />
            <input placeholder="YYYY" className="rounded-lg px-3 py-2 border text-center" value={yyyy} onChange={e=>setYYYY(e.target.value)} />
          </div>

          {/* Time */}
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="HH" className="rounded-lg px-3 py-2 border text-center" value={hh} onChange={e=>setHH(e.target.value)} />
            <input placeholder="MM" className="rounded-lg px-3 py-2 border text-center" value={min} onChange={e=>setMin(e.target.value)} />
            <input placeholder="SS" className="rounded-lg px-3 py-2 border text-center" value={ss} onChange={e=>setSS(e.target.value)} />
          </div>

          {/* NEW: Country / State / City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              className="rounded-lg px-3 py-2 border"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
            >
              {countries.map(c => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>

            <select
              className="rounded-lg px-3 py-2 border"
              value={stateCode}
              onChange={e => setStateCode(e.target.value)}
              disabled={!states.length}
            >
              <option value="">{states.length ? "Select State/Region" : "No states"}</option>
              {states.map(s => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>

            <select
              className="rounded-lg px-3 py-2 border"
              value={cityId}
              onChange={e => setCityId(e.target.value)}
              disabled={!cities.length}
            >
              <option value="">{cities.length ? "Select City" : "No cities"}</option>
              {cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Optional manual override */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">
              Can’t find your place? Type it manually (e.g., “Udupi, Karnataka, India”)
            </label>
            <input
              placeholder="City, State, Country (optional override)"
              className="w-full rounded-lg px-3 py-2 border"
              value={manualPlace}
              onChange={e => setManualPlace(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Using: <span className="font-medium">{finalPlace || "—"}</span>
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancel</button>
            <button
              onClick={() => onSubmit({ dd, mm, yyyy, hh, min, ss, place: finalPlace })}
              className="px-5 py-2 rounded-lg text-white bg-gradient-to-r from-[#F53C44] to-[#FA9F2C] font-semibold"
              disabled={!dd || !mm || !yyyy || !hh || !min || !ss || !finalPlace}
            >
              Save & Generate Kundli
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatSession() {
  const { id } = useParams();
  const astrologer = ASTROLOGERS.find((a) => a.id === id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => `astrologer_chat_${id}`, [id]);
  const profileKey = useMemo(() => `astrologer_profile_${id}`, [id]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profile, setProfile] = useState<{
    dtISO: string;
    coords: { lat:number; lon:number };
    kundli: any;
    kundliSummary: string;
  } | null>(null);

  // Load chat
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    } else {
      setMessages([{
        id: crypto.randomUUID(),
        sender: "astrologer",
        timestamp: Date.now(),
        text: `Namaste! I'm ${astrologer?.name}. To guide you better, I'll first need your birth details (date, time, place).`
      }]);
    }
  }, [storageKey, astrologer?.name]);

  // Persist chat
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Load profile
  useEffect(() => {
    const saved = localStorage.getItem(profileKey);
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    } else {
      setNeedsOnboarding(true);
    }
  }, [profileKey]);

  if (!astrologer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center max-w-md mx-4">
          <div className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-4`}>
            Astrologer Not Available
          </div>
          <p className="text-gray-600 mb-6">The astrologer you're looking for is currently unavailable.</p>
          <Link 
            to="/astrologers" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F53C44] to-[#FA9F2C] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Astrologers
          </Link>
        </div>
      </div>
    );
  }

  // ----- Onboarding submit -> uses your toISO + fetchKundli -----
  async function handleBirthSubmit({ dd, mm, yyyy, hh, min, ss, place }: any) {
    try {
      if (!dd || !mm || !yyyy || !hh || !min || !ss || !place) {
        throw new Error("Please fill all fields");
      }

      const dtISO = toISO(String(yyyy), String(mm), String(dd), String(hh), String(min), String(ss));
      const coords = await geocodePlace(place);
      const kundli = await fetchKundli({ datetime: dtISO, coords });
      const kundliSummary = summarizeKundliForPromptProkerala(kundli);

      const p = { dtISO, coords, kundli, kundliSummary };
      setProfile(p);
      localStorage.setItem(profileKey, JSON.stringify(p));
      setNeedsOnboarding(false);

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "astrologer",
          text: "Thank you! Your kundli is generated. You may now ask anything (career, relationships, finance, health, timing, etc.).",
          timestamp: Date.now()
        }
      ]);
    } catch (e: any) {
      const raw = String(e?.message || "");
      const nice =
        raw.includes("Proxy error") && raw.includes("Invalid format")
          ? "Please check your date/time. Use valid values (DD/MM/YYYY and HH:MM:SS)."
          : raw;
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "astrologer",
          text: `I couldn't generate the kundli: ${nice}`,
          timestamp: Date.now()
        }
      ]);
    }
  }

  function asChatHistory(): ChatTurn[] {
    return messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.text
    }));
  }

  const sendMessage = async (text?: string) => {
    const messageContent = (text ?? inputMessage).trim();
    if (!messageContent) return;

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      sender: "user",
      text: messageContent,
      timestamp: Date.now()
    }]);
    setInputMessage("");

    if (!profile?.kundliSummary) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: "astrologer",
        text: "Please provide your birth details first so I can personalize the guidance.",
        timestamp: Date.now()
      }]);
      setNeedsOnboarding(true);
      return;
    }

    setIsTyping(true);
    try {
      const reply = await askGeminiAstrology({
        question: messageContent,
        kundliSummary: profile.kundliSummary,
        conversationHistory: asChatHistory()
      });

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: "astrologer",
        text: reply,
        timestamp: Date.now()
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: "astrologer",
        text: `Sorry, I couldn't get a response right now (${e?.message || 'error'}). Please try again.`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      {/* Birth details modal */}
      <BirthModal open={needsOnboarding} onClose={() => setNeedsOnboarding(false)} onSubmit={handleBirthSubmit} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/astrotalk/${astrologer.id}`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline font-medium">Back to Profile</span>
              </Link>

              <div className="flex items-center gap-3">
                <img
                  src={astrologer.img}
                  alt={astrologer.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-orange-200"
                />
                <div>
                  <h1 className="font-semibold text-gray-900">{astrologer.name}</h1>
                  <p className="text-sm text-gray-600">₹{astrologer.rate}/min • {astrologer.exp} years experience</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="hidden sm:inline">Live Chat Session</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Questions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Questions</h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="px-4 py-2 rounded-full text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-orange-300 transition-all duration-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-[60vh] overflow-y-auto p-6 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[80%] ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-[#F53C44] to-[#FA9F2C]"
                    : "bg-orange-100"
                }`}>
                  {m.sender === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-orange-600" />
                  )}
                </div>

                <div className={`rounded-2xl px-4 py-3 ${
                  m.sender === "user"
                    ? `bg-gradient-to-r ${gradient} text-white rounded-br-none`
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <p className={`text-xs mt-2 ${m.sender === "user" ? "text-orange-100" : "text-gray-500"}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-orange-600" />
                </div>
                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                    Astrologer is typing...
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your question here... (Press Enter to send)"
              className="flex-1 rounded-xl px-4 py-3 bg-gray-50 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim()}
              className={`rounded-xl px-6 py-3 font-semibold inline-flex items-center gap-2 transition-all ${
                inputMessage.trim()
                  ? `bg-gradient-to-r ${gradient} text-white shadow-lg hover:shadow-xl transform hover:scale-105`
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
