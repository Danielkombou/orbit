"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.forgetPassword({ email });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-card border border-card-border rounded-2xl p-8">
        <h1 className="text-xl font-bold text-center mb-1">Check your email</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          We sent a password reset link to {email}
        </p>
        <Link
          href="/login"
          className="block w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/80 transition-colors text-center"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-card-border rounded-2xl p-8">
      <h1 className="text-xl font-bold text-center mb-1">
        Forgot your password?
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        No worries! Enter your email and we&apos;ll send you a link to reset
        it.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-xs text-center text-muted-foreground mt-6">
        Remember your password?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
