"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export default function NewProjectForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick);
    }

    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (title.length < 2) {
      setError("Project name must be at least 2 characters.");
      return;
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    if (response.ok) {
      form.reset();
      setOpen(false);
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error || "Unable to create project.");
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        New project
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1d27] shadow-2xl shadow-black/50">
          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="text-xs font-semibold text-white/70">New project</p>
            <p className="mt-0.5 text-[11px] text-white/30">
              Create a workspace to organize tasks.
            </p>
          </div>

          <form className="flex flex-col gap-3 p-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/40">
                Project name
              </label>
              <input
                className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
                name="title"
                type="text"
                placeholder="Launch marketing site"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/40">
                Description
              </label>
              <textarea
                className="min-h-[72px] resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500/50 focus:bg-white/[0.07]"
                name="description"
                placeholder="Optional details"
                rows={3}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 items-center rounded-lg border border-white/10 px-3 text-xs text-white/40 transition hover:text-white/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex h-8 items-center rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
