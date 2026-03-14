import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TaskBoard from "./task-board";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: (await params).id,
      ownerId: user.id,
    },
  });

  if (!project) {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: {
      projectId: project.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      labels: {
        select: {
          label: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
      comments: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const normalizedTasks = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    labels: task.labels.map((item) => item.label),
    comments: task.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: comment.user.name || comment.user.email,
    })),
  }));

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Project Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {project.title}
              </h1>
              {project.description ? (
                <p className="mt-2 text-sm text-zinc-500">
                  {project.description}
                </p>
              ) : null}
            </div>
            <Link
              className="h-10 rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
              href="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        </header>

        <TaskBoard projectId={project.id} tasks={normalizedTasks} />
      </div>
    </main>
  );
}


