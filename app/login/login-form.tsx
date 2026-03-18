"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error || "Login failed. Please try again.");
  };

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="badge-pill justify-center text-xs text-white/62">
          Keep your projects in motion
        </div>
        <div className="badge-pill justify-center text-xs text-white/62">
          Pick up where the sprint left off
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium text-white/48">
        Email
        <input
          className="soft-input h-12 rounded-2xl px-4 text-sm"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-white/48">
        Password
        <input
          className="soft-input h-12 rounded-2xl px-4 text-sm"
          name="password"
          type="password"
          placeholder="********"
          required
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        className="accent-button mt-1 flex h-12 items-center justify-center px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-xs leading-6 text-white/32">
        Your dashboard, board filters, and activity feed stay synced as soon as you are back in.
      </p>
    </form>
  );
}