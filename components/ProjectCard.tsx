import type { ReactNode } from "react";

type ProjectCardProps = {
  title: string;
  description?: string | null;
  meta?: string;
  actions?: ReactNode;
};

export function ProjectCard({
  title,
  description,
  meta,
  actions,
}: ProjectCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm text-zinc-600">{description}</p>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              No description provided yet.
            </p>
          )}
        </div>
        {actions ? (
          <div className="shrink-0 flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {meta ? <p className="text-xs text-zinc-400">{meta}</p> : null}
    </div>
  );
}
