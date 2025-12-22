"use client";

import { motion } from "framer-motion";

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.5,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

export default function HeroContent() {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 pointer-events-none"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="relative">
        {/* Glowing "ghost" text behind the main text for effect */}
        <h1 className="absolute inset-0 blur-2xl opacity-30 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 bg-clip-text text-transparent text-7xl md:text-9xl font-extrabold tracking-tighter select-none">
          DIGITAL REALITY
        </h1>
        <h1 className="relative bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent text-7xl md:text-9xl font-extrabold tracking-tighter pb-4 select-none">
          DIGITAL REALITY
        </h1>
      </motion.div>

      <motion.p
        variants={item}
        className="text-lg md:text-xl text-blue-100/70 font-light tracking-wide max-w-2xl mx-auto mb-12 select-none"
      >
        Experience the next generation of web interactivity.
        <br />
        Powered by React Three Fiber.
      </motion.p>

      <motion.div variants={item}>
        <button className="pointer-events-auto group relative px-8 py-3 rounded-full overflow-hidden transition-all duration-300 hover:scale-105">
          {/* Gradient border & background */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="absolute inset-[1px] rounded-full bg-black/80 backdrop-blur-xl z-10" />
          
          {/* Button Text */}
          <span className="relative z-20 text-white font-medium tracking-wider flex items-center gap-2">
            Explore Universe
            {/* Simple arrow icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
          
          {/* Glowing ring animation on hover */}
          <div className="absolute -inset-1 rounded-full blur-md bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
        </button>
      </motion.div>
    </motion.div>
  );
}