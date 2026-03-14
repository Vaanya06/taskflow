"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogout = async () => {
    setError(null);
    const response = await fetch("/api/auth/logout", { method: "POST" });

    if (response.ok) {
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
      return;
    }

    setError("Logout failed.");
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        title="Sign out"
        onClick={handleLogout}
        disabled={isPending}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-white/25 transition hover:bg-white/10 hover:text-white/60 disabled:opacity-50"
      >
        {isPending ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="animate-spin">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="14 6" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M8.5 9l3-3-3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11.5 6H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {error ? <p className="text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
