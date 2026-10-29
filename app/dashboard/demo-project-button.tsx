"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DemoProjectButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openShowcase() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/projects/demo", { method: "POST" });
      const data = await response.json() as { ok?: boolean; projectId?: string; error?: string };
      if (!response.ok || !data.ok || !data.projectId) {
        setError(data.error || "Unable to open the feature showcase.");
        return;
      }
      router.push(`/projects/${data.projectId}?tab=overview`);
    } catch {
      setError("Unable to open the feature showcase. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void openShowcase()}
        disabled={pending}
        aria-busy={pending}
        className="secondary-button flex h-10 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-60"
      >
        {pending ? "Preparing..." : "Explore feature demo"}
      </button>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
