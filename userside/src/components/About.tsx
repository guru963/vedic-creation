// src/sections/ServicesPageFlip.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type Variants, type Easing } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import om from "../assets/om.png";
// ---- Replace with your 3 manuscript images ----
import m1 from "../assets/m1.png"; // Store
import m2 from "../assets/m2.png"; // Pandit Booking
import m3 from "../assets/m3.png"; // Astrosaga

type Card = {
    id: string;
    title: string;
    quote: string;
    description: string;
    image: string;
    cta: { label: string; href: string };
};

const CARDS: Card[] = [
    {
        id: "store",
        title: "Divine Store",
        quote: "Pooja kits & sacred decor, curated with care.",
        description: "Discover a divine collection of authentic Pooja kits, idols, spiritual books, and sacred home decor. Each item is hand-picked to enhance your spiritual practices and bring serenity to your home.",
        image: m1,
        cta: { label: "Open Store", href: "/store" },
    },
    {
        id: "pandit",
        title: "Pandit Booking",
        quote: "Verified Vedic rituals—at home or temple.",
        description: "Easily book verified Pandits for all your Vedic ceremonies, whether at your home or a temple. Our experienced Pandits ensure authentic rituals, bringing blessings and positive energy to your significant events.",
        image: m2,
        cta: { label: "Book a Pandit", href: "/book/pandit" },
    },
    {
        id: "astro",
        title: "AstroSaga",
        quote: "Personalized muhurat, charts & remedies.",
        description: "Gain deeper insights into your life with personalized astrological readings. Get detailed muhurat calculations, birth charts, and effective remedies from experienced astrologers to navigate your life's journey.",
        image: m3,
        cta: { label: "Talk to an Astrologer", href: "/astro" },
    },
];

import { cubicBezier } from "framer-motion";
const easeFlip: Easing = cubicBezier(0.22, 1, 0.36, 1);

export default function ServicesPageFlip() {
    const [idx, setIdx] = useState(0);
    const [flipping, setFlipping] = useState<"next" | "prev" | null>(null);

    const dragX = useMotionValue(0);
    const rotateY = useTransform(dragX, [-180, 0, 180], [12, 0, -12]);

    const current = CARDS[idx];
    const next = (i: number) => (i + 1) % CARDS.length;
    const prev = (i: number) => (i - 1 + CARDS.length) % CARDS.length;

    const stack = useMemo(() => {
        const ids = [idx, next(idx), next(next(idx))];
        return ids.map((i, layer) => ({ data: CARDS[i], layer }));
    }, [idx]);

    function goNext() {
        if (flipping) return;
        setFlipping("next");
    }
    function goPrev() {
        if (flipping) return;
        setFlipping("prev");
    }

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Framer Motion variants for staggered text animation
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
            },
        },
    };

    const textVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    };

    return (
        <section
            className="min-h-screen flex items-center py-10 bg-[#ece8e1]"
            style={{
                perspective: "2000px",
                background: "#ece8e1",
            }}
        >
            <div className="max-w-7xl mx-auto px-6 w-full">
                {/* Title */}
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-center mb-12"
                    style={{
                        background: "linear-gradient(to right, #F53C44, #FA7236, #FA9F2C, #FCD62B)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(2px 2px 0px rgba(0,0,0,0.1))",
                    }}
                >
                    Our Services
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* LEFT: Image flip */}
                    <div className="relative w-full mx-auto max-w-[400px] aspect-[3/4]" style={{ perspective: "1400px" }}>
                        {/* arrows */}
                        <button
                            onClick={goPrev}
                            className="hidden sm:flex absolute -left-8 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-transparent text-gray-700 hover:text-gray-900 transition"
                        >
                            <ChevronLeft size={36} />
                        </button>
                        <button
                            onClick={goNext}
                            className="hidden sm:flex absolute -right-8 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-transparent text-gray-700 hover:text-gray-900 transition"
                        >
                            <ChevronRight size={36} />
                        </button>

                        {stack.map(({ data, layer }) => (
                            <CardLayer
                                key={data.id + "-" + layer}
                                data={data}
                                layer={layer}
                                flipping={flipping}
                                setFlipping={setFlipping}
                                onFlipDone={() => {
                                    setIdx((i) => (flipping === "next" ? next(i) : prev(i)));
                                    setFlipping(null);
                                }}
                                dragX={dragX}
                                rotateY={rotateY}
                            />
                        ))}
                    </div>

                    {/* RIGHT: Service Info with Animated Text Reveal */}

                    <div className="relative text-center lg:text-left p-4 pb-16">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current.id}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={containerVariants}
                            >
                                <motion.h3
                                    className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#4A2500] leading-tight"
                                    variants={textVariants}
                                >
                                    {current.title}
                                </motion.h3>
                                <motion.p
                                    className="mt-3 text-lg sm:text-xl text-[#7A2E00] font-medium leading-relaxed"
                                    variants={textVariants}
                                >
                                    {current.quote}
                                </motion.p>
                                <motion.p
                                    className="mt-5 text-base sm:text-lg text-gray-700 leading-relaxed max-w-xl mx-auto lg:mx-0"
                                    variants={textVariants}
                                >
                                    {current.description}
                                </motion.p>

                                <motion.a
                                    href={current.cta.href}
                                    className="mt-8 inline-flex items-center justify-center px-8 py-3.5 rounded-full text-white text-lg font-bold shadow-lg
                             bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9A3A] hover:from-[#FA9A3A] hover:to-[#F53C44] transition-all duration-300 transform hover:scale-105"
                                    variants={textVariants}
                                >
                                    {current.cta.label}
                                </motion.a>
                            </motion.div>
                        </AnimatePresence>

                        {/* bottom-right OM watermark */}
                        <img
                            src={om}
                            alt=""
                            aria-hidden="true"
                            className="
      pointer-events-none select-none
      absolute top-40 -right-3.5
      w-70 sm:w-70 md:w-70 lg:w-100
      opacity-100 md:opacity-100
      mix-blend-multiply
      [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.25))]
    "
                        />
                    </div>
                </div>
                {/* <div>
            <img src={om}></img>
        </div> */}
            </div>
        </section>
    );
}

/* One visible card in the stack */
function CardLayer({
    data,
    layer,
    flipping,
    setFlipping,
    onFlipDone,
    dragX,
    rotateY,
}: {
    data: Card;
    layer: number;
    flipping: "next" | "prev" | null;
    setFlipping: (v: "next" | "prev" | null) => void;
    onFlipDone: () => void;
    dragX: any;
    rotateY: any;
}) {
    const scale = [1, 0.97, 0.94][layer] ?? 0.92;
    const y = [0, 12, 24][layer] ?? 36;

    const isTop = layer === 0;

    const animateFlip =
        isTop && flipping
            ? { rotateY: flipping === "next" ? -180 : 180, x: flipping === "next" ? 10 : -10 }
            : { rotateY: 0, x: 0 };

    return (
        <motion.div
            className="absolute inset-0 origin-center"
            style={{ zIndex: 100 - layer, scale, y }}
            initial={{ opacity: 0, y: y + 30 }}
            animate={{
                opacity: [1, 0.6, 0.4][layer] ?? 0.2,
                y,
                filter: `blur(${[0, 1, 2][layer]}px)`
            }}
            transition={{ type: "spring", stiffness: 80, damping: 14 }}
        >
            <motion.div
                className="relative w-full h-full rounded-[22px] overflow-hidden cursor-pointer"
                style={{
                    transformStyle: "preserve-3d",
                    x: isTop ? dragX : 0,
                    rotateY: isTop ? rotateY : 0,
                }}
                animate={animateFlip}
                transition={{ duration: 0.8, ease: easeFlip }}
                onAnimationComplete={() => {
                    if (isTop && flipping) onFlipDone();
                }}
                onClick={() => isTop && setFlipping("next")}
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                    if (!isTop) return;
                    if (info.offset.x < -100) setFlipping("next");
                    if (info.offset.x > 100) setFlipping("prev");
                }}
            >
                {/* FRONT */}
                <div className="absolute inset-0 backface-hidden" style={{ transform: "rotateY(0deg)" }}>
                    <img src={data.image} alt={data.title} className="absolute inset-0 w-full h-full object-cover" />
                </div>

                {/* BACK (parchment tint) */}
                <div
                    className="absolute inset-0 backface-hidden"
                    style={{
                        transform: "rotateY(180deg)",
                        background:
                            "radial-gradient(120% 90% at 50% 20%, #F6EAD3 0%, #E7D8B8 45%, #D5C6A3 100%)",
                    }}
                />
            </motion.div>
        </motion.div>
    );
}