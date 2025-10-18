// src/sections/FestiveCornerBento.tsx
import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import bg from "../assets/background.png";
import grid1 from "../assets/grid1.png";
import grid4 from "../assets/grid4.png";
import grid2 from "../assets/grid2.png";
import grid3 from "../assets/grid3.png";

type Tile = {
  id: string;
  title: string;
  desc: string;
  image: string;
  href?: string;
};

const TILES: Tile[] = [
  {
    id: "left-feature",
    title: "Diwali Pooja Kits",
    desc: "Complete Lakshmi Pooja sets—diya, incense, roli-chawal & more.",
    image: grid1,
    href: "/collections/pooja-kits",
  },
  {
    id: "top-right-a",
    title: "Handmade Diyas",
    desc: "Clay diyas to light every corner.",
    image: grid2,
    href: "/collections/diyas",
  },
  {
    id: "top-right-b",
    title: "Rangoli Stencils",
    desc: "Intricate patterns in minutes.",
    image: grid3,
    href: "/collections/rangoli",
  },
  {
    id: "bottom-right-wide",
    title: "Aakash Kandil & Décor",
    desc: "Lanterns, toran & door décor for a warm festive glow.",
    image: grid4,
    href: "/collections/lanterns",
  },
];

/* ========== Motion variants ========== */
const gridVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 22, mass: 0.6 },
  },
};

const FestiveCornerBento: React.FC = () => {
  const [active, setActive] = useState<Tile | null>(null);
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative w-full overflow-hidden">
      {/* Full-section festive background */}
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      />
      {/* subtle legibility help without dulling */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.18),transparent_60%)]" />

      {/* ===== Header (~56vh) ===== */}
      <div className="relative w-full h-[56vh] sm:h-[58vh]">
        <div className="max-w-7xl mx-auto h-full px-6 flex flex-col justify-center items-center text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/35 backdrop-blur-md text-brown-900 font-semibold shadow-sm">
            <Sparkles className="h-4 w-4" />
            Festive Vibes • Diwali
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7A2E00] via-[#8F3B00] to-[#B45309]">
              Light & devotion,
            </span>{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8F3B00] to-[#4A2500]">
              curated for your home.
            </span>
          </h2>

          <p className="mt-3 max-w-2xl text-brown-900/95">
            Explore pooja essentials, décor and sweets—crafted to honor tradition and bring blessings.
          </p>

          <a
            href="/collections/diwali"
            className="mt-6 px-6 sm:px-8 py-3 rounded-full text-white font-semibold shadow-lg hover:shadow-xl transition bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9A3A]"
          >
            View Collections
          </a>
        </div>
      </div>

      {/* ===== 4-tile Bento (Framer Motion) ===== */}
      <div className="relative w-full h-[70vh] overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-6">
          <motion.div
            className="
              grid h-full gap-4 grid-flow-dense
              grid-cols-1
              sm:grid-cols-2
              lg:grid-cols-6 lg:grid-rows-5
            "
            variants={prefersReduced ? undefined : gridVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
          >
            {/* IMPORTANT: spans belong to the motion wrapper (grid item) */}
            <MotionTileCard
              data={TILES[0]}
              onOpen={setActive}
              className="lg:col-span-2 lg:row-span-5"
            />
            <MotionTileCard
              data={TILES[1]}
              onOpen={setActive}
              className="lg:col-span-2 lg:row-span-2"
            />
            <MotionTileCard
              data={TILES[2]}
              onOpen={setActive}
              className="lg:col-span-2 lg:row-span-2"
            />
            <MotionTileCard
              data={TILES[3]}
              onOpen={setActive}
              className="lg:col-span-4 lg:row-span-3"
            />
          </motion.div>
        </div>
      </div>

      {/* ===== Modal (click image) ===== */}
      {active && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h4 className="text-lg font-bold">{active.title}</h4>
              <button
                className="p-2 rounded-full hover:bg-black/5"
                onClick={() => setActive(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <img
                src={active.image}
                alt={active.title}
                className="w-full h-48 object-contain mb-3"
              />
              <p className="text-sm text-gray-700">{active.desc}</p>

              <div className="mt-5 flex items-center justify-between">
                <a
                  href={active.href ?? "#"}
                  className="px-5 py-2.5 rounded-full text-white font-semibold shadow-md bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9A3A]"
                >
                  View Collection
                </a>
                <button
                  onClick={() => setActive(null)}
                  className="px-4 py-2 rounded-full border border-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* --- Motion-enabled grid item wrapper: 
      apply grid span classes here, and make inner card h-full --- */
const MotionTileCard: React.FC<{
  data: Tile;
  className?: string;
  onOpen: (t: Tile) => void;
}> = ({ data, className = "", onOpen }) => {
  return (
    <motion.div variants={tileVariants} className={className}>
      <TileCard data={data} onOpen={onOpen} className="h-full" />
    </motion.div>
  );
};

/* ---- Tile card: full-photo cover + bottom button ---- */
const TileCard: React.FC<{
  data: Tile;
  className?: string;
  onOpen: (t: Tile) => void;
}> = ({ data, className = "", onOpen }) => (
  <div
    onClick={() => onOpen(data)}
    className={`group relative rounded-3xl shadow-md overflow-hidden cursor-pointer ${className}`}
  >
    {/* Photo fills the entire tile */}
    <img
      src={data.image}
      alt={data.title}
      className="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
    />

    {/* Subtle bottom gradient so button/text stay readable */}
    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

    {/* Bottom centered transparent button (always visible) */}
    <a
      href={data.href ?? "#"}
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full
                 text-white font-semibold border border-white/50 bg-white/10 backdrop-blur-[2px]
                 hover:bg-white/10"
    >
      Explore Collections
    </a>
  </div>
);

export default FestiveCornerBento;
