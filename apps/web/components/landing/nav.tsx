"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { OrbitMark } from "@/components/landing/orbit-mark";

const links = [
  { href: "#features", label: "Features" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#about", label: "Pricing" },
  { href: "#privacy", label: "Docs" },
  { href: "#about", label: "About" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <OrbitMark className="size-8 text-primary" />
          <span className="font-display text-lg font-semibold tracking-[0.08em] text-foreground uppercase">
            ORBIT
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-white/10 text-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/5 bg-background/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-2.5 text-center text-sm"
              onClick={() => setOpen(false)}
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

