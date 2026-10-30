"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function AccountIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 17c.4-3 2.3-4.5 5.5-4.5s5.1 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AccountMenu({ dashboardHref }: { dashboardHref: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function logout() {
    setError(null);
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("Logout failed. Please try again.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="My account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="accent-button flex h-10 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.12em]"
      >
        <AccountIcon />
        <span>My account</span>
        <svg aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="m2 4.5 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account options"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl"
        >
          <Link
            href={dashboardHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            My dashboard
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Profile
          </Link>
          <div className="my-1 border-t border-slate-200" />
          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => void logout()}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-rose-700 transition hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
          >
            {isSigningOut ? "Signing out..." : "Log out"}
          </button>
          {error ? <p role="alert" className="px-3 py-2 text-xs text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
