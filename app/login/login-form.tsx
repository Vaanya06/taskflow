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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Email
        <input
          className="h-11 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Password
        <input
          className="h-11 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
          name="password"
          type="password"
          placeholder="********"
          required
          autoComplete="current-password"
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        className="mt-2 h-11 rounded-xl bg-zinc-900 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
