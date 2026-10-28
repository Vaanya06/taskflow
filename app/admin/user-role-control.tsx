"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type UserRoleControlProps = {
  userId: string;
  role: "ADMIN" | "MANAGER" | "USER";
  isCurrentUser: boolean;
};

export default function UserRoleControl({
  userId,
  role,
  isCurrentUser,
}: UserRoleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateRole(nextRole: "ADMIN" | "MANAGER" | "USER") {
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to update user role.");
        return;
      }

      startTransition(() => router.refresh());
    } catch {
      setError("Unable to reach the server. Please try again.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {isCurrentUser ? (
        <span className="badge-pill text-xs text-[var(--accent)]">You · Admin</span>
      ) : (
        <label className="flex items-center gap-3 text-xs text-white/45">
          Role
          <select
            aria-label={`Role for ${userId}`}
            className="soft-input h-10 rounded-xl px-3 text-sm"
            value={role}
            disabled={isPending}
            onChange={(event) => updateRole(event.target.value as "ADMIN" | "MANAGER" | "USER")}
          >
            <option value="USER">User</option>
            <option value="MANAGER" disabled>Manager · appointed to a team</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
      )}
      {error ? <p role="alert" className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
