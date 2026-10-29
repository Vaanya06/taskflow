"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProjectMembershipControlsProps = {
  projectId: string;
  ownerId: string;
  currentUserId: string;
  canManage: boolean;
  members: { id: string; name: string | null; email: string }[];
};

export default function ProjectMembershipControls({
  projectId,
  ownerId,
  currentUserId,
  canManage,
  members,
}: ProjectMembershipControlsProps) {
  const router = useRouter();
  const [newOwnerId, setNewOwnerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage && currentUserId !== ownerId) {
    return null;
  }

  async function updateMembership(method: "PATCH" | "DELETE", body: object) {
    setError(null);
    setPendingMemberId("pending");
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Unable to update project access.");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Unable to update project access. Check your connection and try again.");
    } finally {
      setPendingMemberId(null);
    }
  }

  async function transferOwnership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newOwnerId) return;
    const newOwner = members.find((member) => member.id === newOwnerId);
    if (!newOwner || !window.confirm(`Transfer project ownership to ${newOwner.name || newOwner.email}? You will remain a project member.`)) {
      return;
    }
    await updateMembership("PATCH", { newOwnerId });
  }

  async function removeMember(member: { id: string; name: string | null; email: string }) {
    if (!window.confirm(`Remove ${member.name || member.email} from direct project membership? Team access, if any, remains unchanged.`)) {
      return;
    }
    await updateMembership("DELETE", { userId: member.id });
  }

  return (
    <div className="mt-4 grid gap-3">
      {currentUserId === ownerId && members.length ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => void transferOwnership(event)}>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            Transfer project ownership
            <select
              value={newOwnerId}
              onChange={(event) => setNewOwnerId(event.target.value)}
              className="soft-input h-9 min-w-48 rounded-lg px-2 text-xs"
              required
            >
              <option value="">Choose a project member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={!newOwnerId || isPending} className="secondary-button h-9 px-3 text-xs font-semibold disabled:opacity-50">
            Transfer ownership
          </button>
        </form>
      ) : null}

      {canManage && members.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-slate-600">Direct project members</p>
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="min-w-0 truncate text-xs text-slate-700">{member.name || member.email}</span>
              <button
                type="button"
                onClick={() => void removeMember(member)}
                disabled={pendingMemberId !== null}
                className="secondary-button shrink-0 px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50"
                title="Remove direct project membership"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
