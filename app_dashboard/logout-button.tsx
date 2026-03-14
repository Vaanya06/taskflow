"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    setError(null);
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (response.ok) {
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
      return;
    }

    setError("Logout failed. Please try again.");
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        className="h-10 w-fit rounded-full border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-70"
        type="button"
        onClick={handleLogout}
        disabled={isPending}
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
