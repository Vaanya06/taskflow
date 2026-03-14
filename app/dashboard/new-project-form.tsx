"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function NewProjectForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description }),
    });

    if (response.ok) {
      form.reset();
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error || "Unable to create project.");
  };

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">New Project</h3>
          <p className="text-sm text-zinc-500">
            Create a workspace to organize tasks and collaborators.
          </p>
        </div>
        <button
          className="h-10 rounded-full bg-zinc-900 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Creating..." : "+ New Project"}
        </button>
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Project name
        <input
          className="h-11 rounded-xl border border-zinc-200 px-4 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
          name="title"
          type="text"
          placeholder="Launch marketing site"
          required
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Description
        <textarea
          className="min-h-[96px] rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400"
          name="description"
          placeholder="Optional details about the project goals"
          rows={3}
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
