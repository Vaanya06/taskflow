import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/workspace-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_TASK_PROJECT_ID } from "@/services/company-tasks";
import LogoutButton from "@/app/dashboard/logout-button";
import UserRoleControl from "./user-role-control";
import CompanyTaskBoard from "@/app/company-tasks/company-task-board";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (currentUser.role !== "ADMIN") redirect("/company-tasks");

  const [users, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.task.findMany({
      where: { projectId: COMPANY_TASK_PROJECT_ID },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const employees = users.map(({ id, name, email }) => ({ id, name, email }));

  return (
    <WorkspaceShell
      title="Company tasks"
      currentWorkspace="projects"
      navItems={[
        { href: "/admin", label: "Tasks", icon: "board", active: true },
        { href: "#employees", label: "Employees", icon: "team", badge: String(users.length) },
      ]}
      userName={currentUser.name || currentUser.email}
      userEmail={currentUser.email}
      userAction={<LogoutButton />}
      topbarRight={<span className="badge-pill text-xs text-[var(--accent)]">Administrator</span>}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="panel-card rounded-3xl p-5 sm:p-7">
          <p className="section-kicker">Task tracking</p>
          <h2 className="display-font mt-3 text-4xl text-white/95">Assign work. Track progress.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            Assign each task to an employee, set an optional due date, and follow its status from one list.
          </p>
        </section>

        <CompanyTaskBoard
          isAdmin
          employees={employees}
          initialTasks={tasks.map((task) => ({
            ...task,
            dueDate: task.dueDate?.toISOString() ?? null,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task.updatedAt.toISOString(),
          }))}
        />

        <section id="employees" className="panel-card rounded-3xl p-5 sm:p-7">
          <div className="mb-4">
            <p className="section-kicker">People</p>
            <h2 className="mt-2 text-xl font-semibold text-white/90">Employees</h2>
            <p className="mt-1 text-sm text-white/45">Employee accounts can view their assigned tasks and update progress.</p>
          </div>
          {users.length ? (
            <div className="divide-y divide-white/[0.08]">
              {users.map((employee) => (
                <div key={employee.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-white/80">{employee.name || "Unnamed employee"}</p>
                    <p className="mt-1 text-xs text-white/40">{employee.email}</p>
                  </div>
                  <UserRoleControl userId={employee.id} role={employee.role} isCurrentUser={false} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/45">No employee accounts yet. Employees can create accounts to receive assigned tasks.</p>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
