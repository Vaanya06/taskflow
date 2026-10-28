import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/workspace-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/app/dashboard/logout-button";
import UserRoleControl from "./user-role-control";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [users, projects, userCount, projectCount, adminCount] = await Promise.all([
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
    prisma.user.count(),
    prisma.project.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  return (
    <WorkspaceShell
      title="Admin"
      navItems={[
        { href: "/todos", label: "My tasks", icon: "home" },
        { href: "/admin", label: "Overview", icon: "dashboard", active: true },
        { href: "#users", label: "Users", icon: "team", badge: String(userCount) },
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
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Total users", userCount],
              ["Administrators", adminCount],
              ["Projects", projectCount],
            ].map(([label, count]) => (
              <div key={label} className="panel-card-soft rounded-[24px] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white/90">{count}</p>
              </div>
            ))}
          </div>
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
