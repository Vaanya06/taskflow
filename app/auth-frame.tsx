import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type AuthFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

const previewRows = [
  {
    title: "Launch board",
    detail: "3 high-priority issues and a sprint goal in view.",
  },
  {
    title: "Team rhythm",
    detail: "Comments, assignments, and deadlines stay on one surface.",
  },
  {
    title: "Work pulse",
    detail: "Quick cues help you spot overdue work before it drifts.",
  },
];

export function AuthFrame({
  eyebrow,
  title,
  description,
  footer,
  children,
}: AuthFrameProps) {
  return (
    <main className="auth-theme px-6 py-10">
      <div className="auth-card mx-auto grid max-w-6xl overflow-hidden rounded-[32px] border border-white/[0.08] shadow-[0_24px_64px_rgba(30,41,59,0.09)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-card hidden rounded-none border-0 border-r border-white/[0.08] p-8 lg:flex lg:flex-col">
          <div className="surface-grid absolute inset-0 opacity-[0.08]" />
          <div>
            <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
              <Image src="/ilamed-logo.png" alt="ILAMED logo" width={40} height={40} className="h-10 w-10 object-contain" />
              <div>
                <p className="text-sm font-semibold text-white">ILAMED</p>
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">
                  Flow OS
                </p>
              </div>
            </Link>
            <p className="section-kicker mt-12">Workspace access</p>
            <h2 className="display-font mt-5 max-w-xl text-5xl leading-[1.05] text-white/94">
              Step back into the board with more signal and less clutter.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/50">
              ILAMED keeps planning, task flow, sprint focus, and team updates on one vivid surface so work feels easier to scan at a glance.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            <div className="panel-card-soft float-gentle rounded-[28px] p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
                  Focus board
                </p>
                <span className="badge-pill text-[10px] font-semibold text-[var(--accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
                  Active
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                {previewRows.map((row, index) => (
                  <div
                    key={row.title}
                    className={`rounded-3xl border px-4 py-4 ${
                      index === 0
                        ? "border-[#8eead4]/18 bg-[linear-gradient(135deg,rgba(62,214,177,0.14),rgba(255,255,255,0.04))]"
                        : "border-white/[0.08] bg-white/[0.04]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white/86">{row.title}</p>
                    <p className="mt-1 text-xs leading-6 text-white/42">{row.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="panel-card-soft rounded-[24px] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">Boards</p>
                <p className="mt-2 text-2xl font-semibold text-white/88">Playful</p>
              </div>
              <div className="panel-card-soft rounded-[24px] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">Signals</p>
                <p className="mt-2 text-2xl font-semibold text-white/88">Readable</p>
              </div>
              <div className="panel-card-soft rounded-[24px] p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">Pace</p>
                <p className="mt-2 text-2xl font-semibold text-white/88">Shared</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center p-8 sm:p-10">
          <div className="mx-auto w-full max-w-xl">
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="display-font mt-4 text-5xl leading-[1.04] text-white/94">
              {title}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/48">
              {description}
            </p>

            <div className="panel-card mt-8 rounded-[30px] p-6 sm:p-7">
              {children}
            </div>

            <div className="mt-5 text-sm text-white/45">{footer}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
