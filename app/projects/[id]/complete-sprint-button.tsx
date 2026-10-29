"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CompleteSprintButtonProps = {
  projectId: string;
  sprintId: string;
  sprintTitle: string;
};

export default function CompleteSprintButton({
  projectId,
  sprintId,
  sprintTitle,
}: CompleteSprintButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function completeSprint() {
    if (!window.confirm(`Complete "${sprintTitle}"? Unfinished issues will be moved to the backlog.`)) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/sprints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId, action: "complete" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Unable to complete sprint.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to complete sprint. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void completeSprint()}
        disabled={pending}
        className="secondary-button h-9 px-3 text-xs font-semibold disabled:opacity-50"
      >
        {pending ? "Completing..." : "Complete sprint"}
      </button>
      {error ? <p role="alert" className="mt-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
