"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Mic, Zap, Code2, Bell, Check, ChevronDown } from "lucide-react";
import { OrbitMark } from "@/components/landing/orbit-mark";

const float = (delay: number) => ({
  y: [0, -10, 0],
  transition: {
    duration: 4.8,
    repeat: Infinity,
    ease: "easeInOut" as const,
    delay,
  },
});

const waveHeights = [4, 10, 6, 14, 8, 16, 7, 12, 5, 11, 6, 9, 13, 7];

export function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[38rem] select-none">
      {/* Starfield */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="absolute size-[2px] rounded-full bg-white/70"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53 + 11) % 100}%`,
              opacity: 0.25 + ((i * 17) % 50) / 100,
              boxShadow:
                i % 5 === 0 ? "0 0 6px rgba(0,240,255,0.55)" : undefined,
            }}
          />
        ))}
      </div>

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.2)_0%,transparent_62%)] blur-2xl"
        aria-hidden
      />

      {/* Orbital paths */}
      <svg
        className="pointer-events-none absolute inset-0 size-full text-primary/40"
        viewBox="0 0 400 400"
        aria-hidden
      >
        <ellipse
          cx="200"
          cy="200"
          rx="178"
          ry="112"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeDasharray="2.5 6"
          transform="rotate(-32 200 200)"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="150"
          ry="92"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 7"
          opacity="0.5"
          transform="rotate(-32 200 200)"
        />
      </svg>

      {/* Planet + saturn ring */}
      <div className="absolute inset-[20%] z-[1]">
        {/* Back half of ring */}
        <svg
          className="pointer-events-none absolute inset-[-18%] z-0 size-[136%] text-primary"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <ellipse
            cx="100"
            cy="100"
            rx="92"
            ry="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            opacity="0.35"
            transform="rotate(-28 100 100)"
          />
        </svg>

        <div className="relative z-[1] size-full overflow-hidden rounded-full shadow-[0_0_70px_rgba(0,240,255,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_30%,#234e58_0%,#0c222b_40%,#050b12_72%,#020508_100%)]" />
          <div className="absolute -top-[15%] -left-[25%] h-[85%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.5)_0%,transparent_68%)] blur-md" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_78%,transparent_35%,rgba(0,0,0,0.6)_100%)]" />

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="relative flex size-[44%] items-center justify-center rounded-full border border-primary/45 bg-[#061016]/70 shadow-[0_0_36px_rgba(0,240,255,0.45)] backdrop-blur-sm"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <OrbitMark className="size-[58%] text-primary drop-shadow-[0_0_14px_rgba(0,240,255,0.85)]" />
            </motion.div>
          </div>
        </div>

        {/* Front half of ring (clipped) */}
        <svg
          className="pointer-events-none absolute inset-[-18%] z-[2] size-[136%] text-primary"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <clipPath id="ring-front">
              <rect x="0" y="100" width="200" height="100" />
            </clipPath>
          </defs>
          <ellipse
            cx="100"
            cy="100"
            rx="92"
            ry="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.85"
            transform="rotate(-28 100 100)"
            clipPath="url(#ring-front)"
            style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.7))" }}
          />
        </svg>
      </div>

      {/* Floating cards */}
      <motion.div
        className="absolute top-[5%] left-[1%] z-10 w-[45%] max-w-[11.75rem] sm:left-[-1%]"
        animate={float(0)}
      >
        <OrbitCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Mic className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground sm:text-xs">
              Voice Assistant
            </span>
          </div>
          <div className="flex h-5 items-end gap-[3px] px-0.5">
            {waveHeights.map((h, i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-primary shadow-[0_0_6px_rgba(0,240,255,0.75)]"
                animate={{ height: [h * 0.45, h, h * 0.55, h * 0.9, h * 0.45] }}
                transition={{
                  duration: 1.2 + (i % 4) * 0.12,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground sm:text-[11px]">
            Hey ORBIT
          </p>
        </OrbitCard>
      </motion.div>

      <motion.div
        className="absolute top-[9%] right-[-1%] z-10 w-[47%] max-w-[12.25rem] sm:right-[-3%]"
        animate={float(0.7)}
      >
        <OrbitCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Zap className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground sm:text-xs">
              Task Automation
            </span>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5">
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
            <p className="text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
              Daily standup summary
            </p>
          </div>
        </OrbitCard>
      </motion.div>

      <motion.div
        className="absolute bottom-[9%] left-[-1%] z-10 w-[47%] max-w-[12.25rem] sm:left-[-3%]"
        animate={float(1.2)}
      >
        <OrbitCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Code2 className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground sm:text-xs">
              Code Companion
            </span>
          </div>
          <div className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary sm:text-[11px]">
            Explain this function
          </div>
        </OrbitCard>
      </motion.div>

      <motion.div
        className="absolute right-[-1%] bottom-[5%] z-10 w-[49%] max-w-[12.75rem] sm:right-[-3%]"
        animate={float(1.8)}
      >
        <OrbitCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bell className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold text-foreground sm:text-xs">
              Smart Reminders
            </span>
          </div>
          <p className="text-[10px] font-medium text-foreground sm:text-[11px]">
            Project deadline
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
            Tomorrow, 10:00 AM
          </p>
        </OrbitCard>
      </motion.div>
    </div>
  );
}

export function ScrollCue() {
  return (
    <a
      href="#features"
      className="absolute right-4 bottom-6 z-20 hidden flex-col items-center gap-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-primary sm:right-8 sm:bottom-8 md:flex"
    >
      <span>Scroll to explore</span>
      <motion.span
        animate={{ y: [0, 4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="size-4" />
      </motion.span>
    </a>
  );
}

function OrbitCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a1018]/80 p-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-3.5">
      {children}
    </div>
  );
}
