"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProjectTeamControlProps = {
  projectId: string;
  currentTeamId: string | null;
  teams: { id: string; name: string }[];
  canManage: boolean;
};

export default function ProjectTeamControl({ projectId, currentTeamId, teams, canManage }: ProjectTeamControlProps) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(currentTeamId || "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!canManage) return null;

  async function save() {
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/team`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: teamId || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to update project team.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        Team access
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="soft-input h-9 min-w-48 rounded-lg px-2 text-xs">
          <option value="">Project members only</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => void save()} disabled={pending || teamId === (currentTeamId || "")} className="secondary-button h-9 px-3 text-xs font-semibold disabled:opacity-50">
        {pending ? "Saving…" : "Save team"}
      </button>
      {error ? <p role="alert" className="basis-full text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
