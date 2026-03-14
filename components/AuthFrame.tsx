import Link from "next/link";
import type { ReactNode } from "react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthFrame({
  eyebrow,
  title,
  description,
  footer,
  children,
}: AuthFrameProps) {
  return (
    <main className="min-h-screen bg-[#0f1117] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-5xl overflow-hidden rounded-2xl border border-white/[0.07] bg-[#13161f] shadow-2xl shadow-black/40">
        <section className="hidden w-[42%] flex-col justify-between border-r border-white/[0.07] bg-[#161924] p-8 lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" />
                  <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" opacity="0.6" />
                  <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.6" />
                  <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" opacity="0.3" />
                </svg>
              </span>
              Taskflow
            </Link>
            <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">
              Workspace access
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white/90">
              Step into the same focused workspace your projects already live in.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/45">
              Sign in or create an account to manage projects, keep task movement clear, and review activity from one streamlined dashboard.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                Workspace preview
              </p>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/30">
                Active
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-medium text-white/80">Website relaunch</p>
                <p className="mt-1 text-xs text-white/30">3 active tasks · 1 comment pending</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-medium text-white/80">Release planning</p>
                <p className="mt-1 text-xs text-white/30">Due this week · 5 contributors</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-medium text-white/80">Activity feed</p>
                <p className="mt-1 text-xs text-white/30">Latest comments, task moves, and updates</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/30">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white/90">{title}</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/45">
            {description}
          </p>

          <div className="mt-8 rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
            {children}
          </div>

          <div className="mt-5 text-sm text-white/45">{footer}</div>
        </section>
      </div>
    </main>
  );
}
