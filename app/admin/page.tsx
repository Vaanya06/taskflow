import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/workspace-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/dashboard/logout-button";
import UserRoleControl from "./user-role-control";
import CreateTeamForm from "./create-team-form";
import TeamManagerControl from "./team-manager-control";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [users, projects, teams, userCount, projectCount, adminCount, managerCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        owner: {
          select: { name: true, email: true },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        memberships: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        _count: { select: { memberships: true, projects: true } },
      },
    }),
    prisma.user.count(),
    prisma.project.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "MANAGER" } }),
  ]);

  return (
    <WorkspaceShell
      title="Admin"
      currentWorkspace="projects"
      navItems={[
        { href: "/admin", label: "Overview", icon: "dashboard", active: true },
        { href: "#users", label: "Users", icon: "team", badge: String(userCount) },
        { href: "#teams", label: "Teams", icon: "team", badge: String(teams.length) },
        { href: "#projects", label: "Projects", icon: "folder", badge: String(projectCount) },
      ]}
      userName={currentUser.name || currentUser.email}
      userEmail={currentUser.email}
      userAction={<LogoutButton />}
      topbarRight={<span className="badge-pill text-xs text-[var(--accent)]">Administrator</span>}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="panel-card rounded-[34px] p-6 sm:p-8">
          <p className="section-kicker">Administration</p>
          <h2 className="display-font mt-4 text-5xl leading-[1.02] text-white/94 sm:text-6xl">
            Your team, at a glance.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/48">
            Review account roles and see every project across Taskflow. Project work and destructive project actions remain with project owners.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-5">
            {[
              ["Total users", userCount],
              ["Administrators", adminCount],
              ["Managers", managerCount],
              ["Teams", teams.length],
              ["Projects", projectCount],
            ].map(([label, count]) => (
              <div key={label} className="panel-card-soft rounded-[24px] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white/90">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="teams" className="panel-card rounded-[30px] p-5 sm:p-7">
          <div className="mb-5">
            <p className="section-kicker">Organization</p>
            <h3 className="mt-2 text-2xl font-semibold text-white/90">Teams and managers</h3>
            <p className="mt-1 text-sm text-slate-500">Create teams and appoint a manager using an existing account.</p>
          </div>
          <CreateTeamForm />
          {teams.length ? (
            <div className="mt-4 grid gap-3">
              {teams.map((team) => (
                <div key={team.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-slate-800">{team.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Manager: {team.memberships.filter((membership) => membership.role === "MANAGER").map((membership) => membership.user.name || membership.user.email).join(", ") || "Not assigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <TeamManagerControl
                      teamId={team.id}
                      managerId={team.memberships.find((membership) => membership.role === "MANAGER")?.userId ?? ""}
                      members={team.memberships
                        .filter((membership) => membership.user.role !== "ADMIN")
                        .map((membership) => ({
                          id: membership.userId,
                          label: membership.user.name || membership.user.email,
                        }))}
                    />
                    <span className="badge-pill text-xs">{team._count.memberships} members · {team._count.projects} projects</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No teams have been created yet.</p>}
        </section>

        <section id="users" className="panel-card rounded-[30px] p-5 sm:p-7">
          <div className="mb-5">
            <p className="section-kicker">Accounts</p>
            <h3 className="mt-2 text-2xl font-semibold text-white/90">User access</h3>
          </div>
          <div className="grid gap-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-4 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/85">{user.name || "Unnamed user"}</p>
                  <p className="mt-1 truncate text-sm text-white/45">{user.email}</p>
                  <p className="mt-1 text-xs text-white/30">
                    Joined {user.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <UserRoleControl
                  userId={user.id}
                  role={user.role}
                  isCurrentUser={user.id === currentUser.id}
                />
              </div>
            ))}
          </div>
        </section>

        <section id="projects" className="panel-card rounded-[30px] p-5 sm:p-7">
          <div className="mb-5">
            <p className="section-kicker">Workspace inventory</p>
            <h3 className="mt-2 text-2xl font-semibold text-white/90">All projects</h3>
          </div>
          {projects.length ? (
            <div className="grid gap-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/85">{project.title}</p>
                    <p className="mt-1 truncate text-sm text-white/45">
                      Owner: {project.owner.name || project.owner.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs text-white/42">
                    <span className="badge-pill">{project._count.members + 1} members</span>
                    <span className="badge-pill">{project._count.tasks} tasks</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-white/45">
              No projects have been created yet.
            </p>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
