"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      window.location.replace("/");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full mt-1 px-3 py-2.5 bg-secondary/50 rounded-xl text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/30 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full mt-1 px-3 py-2.5 bg-secondary/50 rounded-xl text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/30 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
