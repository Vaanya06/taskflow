"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (response.ok) {
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error || "Registration failed. Please try again.");
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-medium text-white/45">
        Name
        <input
          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          name="name"
          type="text"
          placeholder="Avery Lane"
          autoComplete="name"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-white/45">
        Email
        <input
          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          name="email"
          type="email"
          placeholder="you@company.com"
          required
          autoComplete="email"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-white/45">
        Password
        <input
          className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      {error ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      ) : null}
      <button
        className="mt-2 flex h-10 items-center justify-center rounded-lg bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
        type="submit"
        disabled={isPending}
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
