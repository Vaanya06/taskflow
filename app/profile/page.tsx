import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/app/workspace-shell";
import LogoutButton from "@/app/dashboard/logout-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <WorkspaceShell
      title="Profile"
      currentWorkspace="projects"
      navItems={[
        {
          href: user.role === "ADMIN" ? "/admin" : "/company-tasks",
          label: user.role === "ADMIN" ? "Company tasks" : "My tasks",
          icon: "board",
        },
      ]}
      userName={user.name || user.email}
      userEmail={user.email}
      userAction={<LogoutButton />}
    >
      <section className="panel-card mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
        <p className="section-kicker">Account details</p>
        <h2 className="mt-2 text-xl font-semibold text-white/90">Your profile</h2>
        <dl className="mt-6 divide-y divide-white/[0.08]">
          <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
            <dt className="text-sm text-white/40">Name</dt>
            <dd className="text-sm text-white/80">{user.name || "Not provided"}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
            <dt className="text-sm text-white/40">Email</dt>
            <dd className="text-sm text-white/80">{user.email}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-4">
            <dt className="text-sm text-white/40">Account type</dt>
            <dd className="text-sm text-white/80">{user.role === "ADMIN" ? "Administrator" : "Employee"}</dd>
          </div>
        </dl>
      </section>
    </WorkspaceShell>
  );
}
