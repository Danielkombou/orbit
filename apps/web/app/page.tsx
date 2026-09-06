import Link from "next/link";
import {
  Mic,
  Zap,
  Code2,
  Brain,
  Shield,
  Lock,
  Puzzle,
  Sparkles,
  Play,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { OrbitMark } from "@/components/landing/orbit-mark";
import { HeroVisual, ScrollCue } from "@/components/landing/hero-visual";

const trust = [
  { icon: Lock, label: "Local First" },
  { icon: Shield, label: "Privacy Focused" },
  { icon: Puzzle, label: "Open & Extensible" },
  { icon: Sparkles, label: "Always Improving" },
];

const features = [
  {
    icon: Mic,
    title: "Voice Control",
    description:
      "Talk naturally and let ORBIT handle the rest — hands-free focus for real work.",
  },
  {
    icon: Zap,
    title: "Task Automation",
    description:
      "Turn recurring chores into one-shot commands that run when you need them.",
  },
  {
    icon: Code2,
    title: "Code & Dev Support",
    description:
      "A companion for debugging, scaffolding, and shipping without leaving your flow.",
  },
  {
    icon: Brain,
    title: "Smart Memory",
    description:
      "Context that sticks with you — preferences, projects, and priorities, privately.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-x-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,240,255,0.12),transparent_55%)]"
        aria-hidden="true"
      />

      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-24">
          <div className="relative z-10 order-2 text-center lg:order-1 lg:text-left">
            <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-primary uppercase">
              AI Assistant · Private · Powerful
            </p>
            <h1 className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your <span className="text-primary">Orbit.</span> Infinite
              Possibilities.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              ORBIT is your personal AI assistant that lives on your device.
              Built for focus, productivity and complete privacy. Always ready.
              Always with you.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_0_28px_rgba(0,240,255,0.35)] transition-opacity hover:opacity-90 sm:w-auto"
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-7 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 sm:w-auto"
              >
                <Play className="size-4 fill-current text-primary" />
                See ORBIT in Action
              </a>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <HeroVisual />
          </div>

          <ScrollCue />
        </section>

        {/* Trust */}
        <section className="border-y border-white/5 bg-surface/60 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Trusted by developers & creators
            </p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {trust.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground"
                >
                  <Icon className="size-4 text-primary" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need.
                <span className="mt-1 block text-primary">
                  Right at your fingertips.
                </span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                One assistant for voice, tasks, code, and memory — tuned to how
                you work.
              </p>
            </div>

            <div
              id="capabilities"
              className="mt-14 grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-card-border bg-card/80 p-5 transition-colors hover:border-primary/35"
                >
                  <div className="mb-4 inline-flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-20 pb-20 sm:pb-28">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Local First.
                <span className="mt-1 block text-primary">
                  Your data stays with you.
                </span>
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                ORBIT is designed so your conversations, files, and context
                never leave your machine unless you choose otherwise.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start privately
              </Link>
            </div>

            <div
              className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center"
              aria-hidden="true"
            >
              <div className="absolute inset-8 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex size-44 items-center justify-center rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-secondary/20 shadow-[0_0_60px_var(--glow)]">
                <Shield className="size-20 text-primary" strokeWidth={1.25} />
                <Lock className="absolute bottom-8 right-8 size-7 text-primary" />
              </div>
            </div>
          </div>
        </section>

        {/* About / CTA */}
        <section
          id="about"
          className="scroll-mt-20 border-t border-white/5 bg-surface py-16 sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Ready to enter your orbit?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join early builders shaping a private, always-on AI companion.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <OrbitMark className="size-5 text-primary" />
            <span>© {new Date().getFullYear()} ORBIT</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-primary">
              Features
            </a>
            <a href="#privacy" className="hover:text-primary">
              Privacy
            </a>
            <Link href="/login" className="hover:text-primary">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
