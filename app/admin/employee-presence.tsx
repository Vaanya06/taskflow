"use client";

import { useCallback, useEffect, useState } from "react";
import UserRoleControl from "./user-role-control";

type Employee = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "MANAGER" | "ADMIN";
  isBlocked: boolean;
  createdAt: string;
  lastSeenAt: string | null;
};

type PresenceSnapshot = {
  ok?: boolean;
  error?: string;
  employees?: { id: string; lastSeenAt: string | null }[];
};

const ONLINE_WINDOW_MS = 90_000;

function formatLastSeen(value: string | null, now: number) {
  if (!value) return "No recent activity";
  const elapsedMinutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Active just now";
  if (elapsedMinutes === 1) return "Active 1 minute ago";
  if (elapsedMinutes < 60) return `Active ${elapsedMinutes} minutes ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours === 1) return "Active 1 hour ago";
  if (elapsedHours < 24) return `Active ${elapsedHours} hours ago`;
  return `Last active ${new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function EmployeePresence({ employees: initialEmployees }: { employees: Employee[] }) {
  const [lastSeenById, setLastSeenById] = useState<Record<string, string | null>>(
    () => Object.fromEntries(initialEmployees.map((employee) => [employee.id, employee.lastSeenAt])),
  );
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);

  const refreshPresence = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/presence", { cache: "no-store" });
      const data = await response.json() as PresenceSnapshot;
      if (!response.ok || !data.ok || !data.employees) {
        throw new Error(data.error || "Unable to refresh employee presence.");
      }
      setLastSeenById(Object.fromEntries(data.employees.map((employee) => [employee.id, employee.lastSeenAt])));
      setNow(Date.now());
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh employee presence.");
    }
  }, []);

  useEffect(() => {
    void refreshPresence();
    const refreshInterval = window.setInterval(() => void refreshPresence(), 15_000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [refreshPresence]);

  return (
    <div className="divide-y divide-white/[0.08]">
      {error ? <p role="alert" className="mb-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error} Showing the last known status.</p> : null}
      {initialEmployees.map((employee) => {
        const lastSeenAt = lastSeenById[employee.id] ?? null;
        const online = !employee.isBlocked && lastSeenAt !== null && now - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
        return (
          <div key={employee.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/80">{employee.name || "Unnamed employee"}</p>
              <p className="mt-1 text-xs text-white/40">{employee.email}</p>
              <p className="mt-2 flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span className={online ? "font-medium text-emerald-300" : "text-white/45"}>
                  {online ? "Online" : "Offline"}
                </span>
                <span className="text-white/35">{formatLastSeen(lastSeenAt, now)}</span>
              </p>
            </div>
            <UserRoleControl
              userId={employee.id}
              role={employee.role}
              isBlocked={employee.isBlocked}
              displayName={employee.name || employee.email}
              isCurrentUser={false}
            />
          </div>
        );
      })}
    </div>
  );
}
