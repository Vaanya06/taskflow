import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const features = [
  {
    title: "Playful project rooms",
    description: "Projects feel alive with pulse cards, progress bars, and clearer status cues instead of flat tables.",
  },
  {
    title: "Sharper board flow",
    description: "Switch between board lanes and a focused agenda view so drag-and-drop and deeper review can coexist.",
  },
  {
    title: "Signals that matter",
    description: "Overdue work, sprint scope, ownership, and fresh comments stay visible before they become blockers.",
  },
];

const rituals = [
  {
    title: "Start with momentum",
    detail: "Open the dashboard, scan your queue, and spot risk in under a minute.",
  },
  {
    title: "Shape the sprint",
    detail: "Use backlog previews, story points, and active-sprint highlights to pull work with more confidence.",
  },
  {
    title: "Close the loop",
    detail: "Comments, labels, and completion cues give every task a cleaner finish line.",
  },
];

const workflowSteps = [
  ["01", "Create a workspace", "Spin up a project room for the workstream, launch, or client effort you want to coordinate."],
  ["02", "Plan the board", "Capture issues, drop them into a sprint, and slice the view by priority, due date, teammate, or label."],
  ["03", "Keep the rhythm", "Move work forward, comment in context, and use the activity timeline to keep everyone aligned."],
] as const;

const faqItems = [
  {
    question: "What kind of team is Taskflow best for?",
    answer: "Taskflow works well for small teams that want project clarity without giving up the speed of a lightweight board.",
  },
  {
    question: "Can I manage both backlog planning and active sprint work?",
    answer: "Yes. The workspace now highlights backlog candidates, active sprint scope, deadlines, and a more focused agenda view side by side.",
  },
  {
    question: "Does it support collaboration beyond just moving tasks?",
    answer: "Yes. Members, comments, labels, and project activity all stay tied to the task context so updates are easier to follow.",
  },
  {
    question: "How quickly can I get started?",
    answer: "Create an account, create a workspace, and start capturing tasks right away. The board, dashboards, and quick views are ready immediately.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open dashboard" : "Create account";
  const secondaryHref = user ? "/dashboard" : "/login";
  const secondaryLabel = user ? "Review projects" : "Sign in";

  return (
    <main className="min-h-screen text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[rgba(7,18,25,0.78)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(62,214,177,0.95),rgba(127,211,247,0.84))] text-[#05231d] shadow-[0_18px_34px_rgba(62,214,177,0.22)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.32" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Taskflow</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Flow OS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/48 md:flex">
            <Link href="#features" className="transition hover:text-white/84">Features</Link>
            <Link href="#workflow" className="transition hover:text-white/84">Workflow</Link>
            <Link href="#faq" className="transition hover:text-white/84">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href={secondaryHref} className="secondary-button hidden h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.18em] sm:flex">
              {secondaryLabel}
            </Link>
            <Link href={primaryHref} className="accent-button flex h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.18em]">
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="px-6 pb-16 pt-14 sm:pb-20 sm:pt-18">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="section-kicker">A brighter team workspace</p>
            <h1 className="display-font mt-5 max-w-4xl text-6xl leading-[0.96] text-white/96 sm:text-7xl">
              Project tracking with more spark, less sludge.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/50 sm:text-lg">
              Taskflow now leans into clearer signals, richer board views, and friendlier momentum cues so planning and execution feel faster to scan and more fun to use.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="accent-button flex h-12 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.18em]">
                {primaryLabel}
              </Link>
              <Link href="#features" className="secondary-button flex h-12 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.18em]">
                Explore the workspace
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/58">
              <span className="badge-pill">Interactive board views</span>
              <span className="badge-pill">Sprint-aware planning</span>
              <span className="badge-pill">Cleaner task details</span>
            </div>
          </div>

          <div className="panel-card float-gentle rounded-[34px] p-6 sm:p-7">
            <div className="surface-grid absolute inset-0 opacity-[0.08]" />
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Live preview</p>
                <p className="mt-1 text-sm text-white/42">A workspace that feels more like a control room.</p>
              </div>
              <span className="badge-pill text-[10px] font-semibold text-[var(--accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
                Updated
              </span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="panel-card-soft rounded-[28px] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Flow cues</p>
                <div className="mt-4 grid gap-3">
                  {[
                    ["Sprint pulse", "7 issues / 18 points"],
                    ["Attention", "2 overdue / 4 due soon"],
                    ["Momentum", "5 completed this week"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                      <p className="text-xs text-white/34">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-white/86">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="panel-card-soft rounded-[28px] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Board pulse</p>
                    <span className="text-[11px] text-white/34">Agenda + lanes</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {[
                      ["Todo", ["Pricing review", "QA follow-ups"]],
                      ["In progress", ["Landing polish", "Billing bug"]],
                      ["Done", ["New queue card", "Activity refresh"]],
                    ].map(([label, items]) => (
                      <div key={label as string} className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/28">{label}</p>
                        <div className="mt-3 grid gap-2">
                          {(items as string[]).map((item) => (
                            <div key={item} className="rounded-2xl border border-white/[0.08] bg-[rgba(7,18,25,0.42)] px-3 py-2 text-xs text-white/70">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Projects", "Structured"],
                    ["Board", "Playable"],
                    ["Updates", "Visible"],
                  ].map(([label, value]) => (
                    <div key={label} className="panel-card-soft rounded-[24px] p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white/28">{label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white/88">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="section-kicker">Built for momentum</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.02] text-white/94">
              One system for planning, flow, and daily signal.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/48 sm:text-base">
              The refreshed experience keeps the dark control-room feel, but adds more warmth, better hierarchy, and interactive surfaces where the work actually happens.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <div key={feature.title} className="panel-card-soft panel-hover rounded-[30px] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(62,214,177,0.16),rgba(255,149,101,0.18))] text-sm font-semibold text-white/80">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white/88">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/46">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.04fr_0.96fr]">
            <div className="panel-card rounded-[32px] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">What changed</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {rituals.map((ritual) => (
                  <div key={ritual.title} className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-sm font-semibold text-white/86">{ritual.title}</p>
                    <p className="mt-2 text-sm leading-7 text-white/42">{ritual.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card-soft rounded-[32px] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Why it feels lighter</p>
              <p className="mt-4 text-sm leading-7 text-white/46">
                A stronger visual rhythm means fewer moments hunting for the next thing to do. The dashboard calls out your queue, the project workspace exposes sprint health, and task cards give labels and comments more breathing room.
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  "Agenda view for focused review",
                  "Task composer templates and quick due dates",
                  "Reusable labels you can add or remove without friction",
                ].map((item) => (
                  <div key={item} className="badge-pill justify-between rounded-[22px] px-4 py-3 text-sm text-white/66">
                    {item}
                    <span className="text-[var(--accent)]">+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl panel-card rounded-[34px] p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="section-kicker">Workflow</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.04] text-white/94">
              Create, shape, move, and close the loop from one workspace.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflowSteps.map(([step, title, description]) => (
              <div key={step} className="panel-card-soft rounded-[28px] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">{step}</p>
                <h3 className="mt-4 text-xl font-semibold text-white/88">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/44">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="section-kicker">FAQ</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.04] text-white/94">
              Common questions, now with answers you can open inline.
            </h2>
          </div>
          <div className="mt-8 grid gap-4">
            {faqItems.map((item) => (
              <details key={item.question} className="panel-card-soft group rounded-[28px] p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-semibold text-white/88">
                  {item.question}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/56 transition group-open:rotate-45 group-open:text-[var(--accent)]">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/48">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}