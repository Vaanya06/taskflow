import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectCard } from "@/components/ProjectCard";
import DeleteProjectButton from "./delete-project-button";
import LogoutButton from "./logout-button";
import NewProjectForm from "./new-project-form";

function formatProjectDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityDate(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const activities = await prisma.activity.findMany({
    where: {
      project: {
        ownerId: user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="flex flex-col gap-3 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Taskflow Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome, {user.name || user.email}
          </h1>
          <p className="text-sm text-zinc-500">
            You are signed in as {user.email}.
          </p>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <p className="text-sm text-zinc-500">{projects.length} total</p>
          </div>

          <NewProjectForm />

          <div className="grid gap-4">
            {projects.length ? (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  title={project.title}
                  description={project.description}
                  meta={`Created ${formatProjectDate(project.createdAt)}`}
                  actions={
                    <>
                      <Link
                        className="h-9 rounded-full border border-zinc-200 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700"
                        href={`/projects/${project.id}`}
                      >
                        Open
                      </Link>
                      <DeleteProjectButton
                        projectId={project.id}
                        projectTitle={project.title}
                      />
                    </>
                  }
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-sm text-zinc-500">
                No projects yet. Create one to get started.
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Activity Feed</h2>
            <p className="text-sm text-zinc-500">Latest updates</p>
          </div>

          <div className="grid gap-3">
            {activities.length ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4"
                >
                  <p className="text-sm text-zinc-700">
                    <span className="font-semibold text-zinc-900">
                      {activity.user.name || activity.user.email}
                    </span>{" "}
                    {activity.message}
                  </p>
                  <span className="text-xs text-zinc-400">
                    {formatActivityDate(activity.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-sm text-zinc-500">
                No activity yet. Create or update a task to see updates here.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
