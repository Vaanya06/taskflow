"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteProjectButtonProps = {
  projectId: string;
  projectTitle: string;
};

export default function DeleteProjectButton({
  projectId,
  projectTitle,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${projectTitle}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error || "Unable to delete project.");
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="h-9 rounded-full border border-zinc-200 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
        type="button"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting" : "Delete"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
