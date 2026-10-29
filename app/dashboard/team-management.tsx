"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TeamData = {
  id: string;
  name: string;
  memberships: {
    id: string;
    role: "MANAGER" | "MEMBER";
    user: { id: string; name: string | null; email: string };
  }[];
  projects: { id: string; title: string }[];
};

export default function TeamManagement() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [pendingMember, setPendingMember] = useState<string | null>(null);

  async function refreshTeams() {
    const response = await fetch("/api/teams");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to refresh teams.");
    setTeams(data.teams);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/teams")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load teams.");
        if (active) setTeams(data.teams);
      })
      .catch((error: unknown) => {
        if (active) setMessages({ load: error instanceof Error ? error.message : "Unable to load teams." });
      });
    return () => { active = false; };
  }, []);

  async function addMember(team: TeamData) {
    setMessages((current) => ({ ...current, [team.id]: "" }));
    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emails[team.id] || "" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessages((current) => ({ ...current, [team.id]: data.error || "Unable to add member." }));
        return;
      }
      setEmails((current) => ({ ...current, [team.id]: "" }));
      setMessages((current) => ({ ...current, [team.id]: `Added ${data.member.email}.` }));
      await refreshTeams();
    } catch {
      setMessages((current) => ({ ...current, [team.id]: "Unable to add member. Check your connection and try again." }));
    }
  }

  async function updateMemberRole(team: TeamData, membership: TeamData["memberships"][number]) {
    const role = membership.role === "MANAGER" ? "MEMBER" : "MANAGER";
    setPendingMember(`${team.id}:${membership.user.id}`);
    setMessages((current) => ({ ...current, [team.id]: "" }));
    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: membership.user.id, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessages((current) => ({ ...current, [team.id]: data.error || "Unable to update member role." }));
        return;
      }
      await refreshTeams();
      setMessages((current) => ({ ...current, [team.id]: "Member role updated." }));
    } catch {
      setMessages((current) => ({ ...current, [team.id]: "Unable to update member role. Check your connection and try again." }));
    } finally {
      setPendingMember(null);
    }
  }

  async function removeMember(team: TeamData, membership: TeamData["memberships"][number]) {
    const label = membership.user.name || membership.user.email;
    if (!window.confirm(`Remove ${label} from ${team.name}?`)) return;
    setPendingMember(`${team.id}:${membership.user.id}`);
    setMessages((current) => ({ ...current, [team.id]: "" }));
    try {
      const response = await fetch(`/api/teams/${team.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: membership.user.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessages((current) => ({ ...current, [team.id]: data.error || "Unable to remove member." }));
        return;
      }
      await refreshTeams();
      setMessages((current) => ({ ...current, [team.id]: `Removed ${label}.` }));
    } catch {
      setMessages((current) => ({ ...current, [team.id]: "Unable to remove member. Check your connection and try again." }));
    } finally {
      setPendingMember(null);
    }
  }

  if (!teams.length && !messages.load) return null;

  return (
    <section className="panel-card rounded-[30px] p-5 sm:p-7">
      <div className="mb-5">
        <p className="section-kicker">Your teams</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Team management</h2>
        <p className="mt-1 text-sm text-slate-500">Invite existing accounts to your teams. Members will see projects connected to that team.</p>
      </div>
      {messages.load ? <p role="alert" className="text-sm text-rose-600">{messages.load}</p> : null}
      <div className="grid gap-4">
        {teams.map((team) => (
          <article key={team.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">{team.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{team.memberships.length} members · {team.projects.length} connected projects</p>
              </div>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void addMember(team); }}>
                <input required type="email" value={emails[team.id] || ""} onChange={(event) => setEmails((current) => ({ ...current, [team.id]: event.target.value }))} placeholder="member@company.com" className="soft-input h-9 w-52 rounded-lg px-3 text-xs" />
                <button className="secondary-button px-3 text-xs font-semibold">Add member</button>
              </form>
            </div>
            <div className="mt-3 grid gap-2">
              {team.memberships.map((membership) => (
                <div key={membership.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <span className="min-w-0 truncate text-xs text-slate-700">
                    {membership.user.name || membership.user.email}
                    <span className="ml-2 text-slate-400">{membership.role === "MANAGER" ? "Manager" : "Member"}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void updateMemberRole(team, membership)}
                      disabled={pendingMember !== null}
                      className="secondary-button px-2.5 py-1 text-[10px] font-semibold disabled:opacity-50"
                    >
                      {membership.role === "MANAGER" ? "Make member" : "Make manager"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeMember(team, membership)}
                      disabled={pendingMember !== null}
                      className="secondary-button px-2.5 py-1 text-[10px] font-semibold text-rose-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {team.projects.length ? (
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                Projects: {team.projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                    {project.title}
                  </Link>
                ))}
              </p>
            ) : null}
            {messages[team.id] ? (
              <p
                role={/^(Added |Removed |Member role updated)/.test(messages[team.id]) ? "status" : "alert"}
                className="mt-2 text-xs text-slate-600"
              >
                {messages[team.id]}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
