export type Astrologer = {
  id: string;
  name: string;
  rate: number; // ₹/min
  exp: number; // years
  skills: string[];
  offer?: boolean;
  img: string;
  shortDesc: string;
  bio: string;
  languages: string[];
  rating: number; // 0-5
};

export const ASTROLOGERS: Astrologer[] = [
  {
    id: "a1",
    name: "Swami Ji",
    rate: 9,
    exp: 12,
    skills: ["Vedic", "Prashna", "Remedies"],
    offer: true,
    img: "https://picsum.photos/seed/astro1/240",
    shortDesc: "Calm guidance for daily hurdles and spiritual alignment.",
    bio: "Swami Ji blends classical Vedic principles with simple, actionable remedies. Clients love the clarity and grounded approach he brings to relationships, career, and spiritual growth.",
    languages: ["Hindi", "English"],
    rating: 4.7,
  },
  {
    id: "a2",
    name: "Arjun Pandit",
    rate: 11,
    exp: 7,
    skills: ["Career", "Numerology"],
    img: "https://picsum.photos/seed/astro2/240",
    shortDesc: "Career clarity with practical timelines and numerology insights.",
    bio: "Arjun uses numerology along with Vedic timing tools to map career opportunities, interview windows, and growth cycles—ideal for job switches and students.",
    languages: ["English", "Hindi"],
    rating: 4.5,
  },
  {
    id: "a3",
    name: "Mr. Krishnamurthy",
    rate: 16,
    exp: 20,
    skills: ["KP", "Horary", "Property"],
    img: "https://picsum.photos/seed/astro3/240",
    shortDesc: "KP expert for time‑specific answers and property decisions.",
    bio: "With two decades of KP practice, he gives sharp horary answers—great for yes/no decisions, property matters, and travel windows.",
    languages: ["English", "Tamil", "Hindi"],
    rating: 4.8,
  },
  {
    id: "a4",
    name: "Love Guru",
    rate: 21,
    exp: 9,
    skills: ["Relationships", "Compatibility"],
    img: "https://picsum.photos/seed/astro4/240",
    shortDesc: "Warm counsel for love, breakups, and compatibility checks.",
    bio: "Compassionate listener who focuses on healing and realistic steps to rebuild trust and connection.",
    languages: ["English", "Hindi"],
    rating: 4.6,
  },
  {
    id: "a5",
    name: "Astro Ananya",
    rate: 11,
    exp: 6,
    skills: ["Tarot", "Health", "Wellness"],
    offer: true,
    img: "https://picsum.photos/seed/astro5/240",
    shortDesc: "Tarot‑led wellness with gentle lifestyle guidance.",
    bio: "Ananya mixes tarot and transit‑based guidance for daily wellness, stress balance, and mindful routines.",
    languages: ["English", "Hindi"],
    rating: 4.4,
  },
  {
    id: "a6",
    name: "Dr. Raman",
    rate: 22,
    exp: 18,
    skills: ["Medical", "Vastu"],
    img: "https://picsum.photos/seed/astro6/240",
    shortDesc: "Medical astrology & vastu tweaks for long‑term balance.",
    bio: "Raman focuses on chronic issues through medical astrology and simple vastu corrections for homes and offices.",
    languages: ["English", "Hindi", "Kannada"],
    rating: 4.7,
  },
  {
    id: "a7",
    name: "Acharya Joshi",
    rate: 21,
    exp: 14,
    skills: ["Vedic", "Mantra", "Rituals"],
    img: "https://picsum.photos/seed/astro7/240",
    shortDesc: "Ritual‑based remedies and practical mantra suggestions.",
    bio: "Traditional acharya helping with family peace, education, and business stability through authentic rituals.",
    languages: ["Hindi", "Marathi"],
    rating: 4.6,
  },
  {
    id: "a8",
    name: "Love Oracle",
    rate: 21,
    exp: 8,
    skills: ["Compatibility", "Tarot"],
    img: "https://picsum.photos/seed/astro8/240",
    shortDesc: "Quick compatibility checks with tarot & transit insights.",
    bio: "Great for on‑the‑spot clarity about proposals, reunions, and timing for crucial talks.",
    languages: ["English"],
    rating: 4.3,
  },
  {
    id: "a9",
    name: "Guru Anil",
    rate: 22,
    exp: 16,
    skills: ["Career", "Finance", "Business"],
    img: "https://picsum.photos/seed/astro9/240",
    shortDesc: "Business & finance planning with transit baselines.",
    bio: "Anil helps founders and working pros optimize cash‑flow windows and launches based on planetary cycles.",
    languages: ["English", "Hindi"],
    rating: 4.7,
  },
];
