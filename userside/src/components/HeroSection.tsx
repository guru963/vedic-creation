import React, { useRef, useEffect } from "react";
import {
  motion,
  type Variants,
  useInView,
  useAnimation,
} from "framer-motion";

// Variants
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const EssenceHero: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  const inView = useInView(ref, {
    amount: 0.4,
    // rootMargin: "-10% 0px -10% 0px",
  });

  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start("show");
    else controls.start("hidden");
  }, [inView, controls]);

  return (
    <section className="relative w-full min-h-[70vh] flex items-center bg-[#FAF7F2] text-black overflow-hidden">
      {/* Decorative vignette tuned for light background */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(100%_60%_at_50%_40%,rgba(250,170,90,0.10),rgba(0,0,0,0)_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10">
        {/* WRAPPER that controls scroll-trigger */}
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={controls}
        >

          {/* Headline with your gradient */}
          <motion.h1
            variants={container}
            // keep the same sizing rhythm as your original
            className="font-serif font-semibold leading-[0.95] text-[9vw] md:text-[5vw] xl:text-[100px] tracking-tight"
          >
            <motion.span
              variants={fadeUp}
              className="block bg-clip-text text-transparent bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9A3A]"
            >
              Connect with the divine,
            </motion.span>
            <motion.span
              variants={fadeUp}
              className="block bg-clip-text text-transparent bg-gradient-to-r from-[#fa7a3a] to-[#d49605]"
            >
              anywhere, anytime.
            </motion.span>
          </motion.h1>

          {/* Copy */}
          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-3xl text-base md:text-lg text-neutral-700"
          >
            Experience serene visuals and meaningful guidance—crafted to be clear, calm, and always within reach.
          </motion.p>

          {/* Underline accent */}
    
        </motion.div>
      </div>

      {/* Soft gradient bar at the bottom for depth (light theme) */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
};

export default EssenceHero;
