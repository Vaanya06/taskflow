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
    const refreshed = await fetch("/api/teams");
    const teamData = await refreshed.json();
    if (refreshed.ok) setTeams(teamData.teams);
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
            <div className="mt-3 flex flex-wrap gap-2">
              {team.memberships.map((membership) => (
                <span key={membership.id} className="badge-pill text-xs">
                  {membership.user.name || membership.user.email}{membership.role === "MANAGER" ? " · Manager" : ""}
                </span>
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
            {messages[team.id] ? <p role={messages[team.id].startsWith("Added ") ? undefined : "alert"} className="mt-2 text-xs text-slate-600">{messages[team.id]}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
