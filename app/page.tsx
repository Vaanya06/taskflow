import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const features = [
  {
    title: "Project spaces",
    description: "Organize work in focused spaces with clear actions, readable tables, and less interface noise.",
  },
  {
    title: "Board flow",
    description: "Move tasks across lanes, keep priorities visible, and track deadlines without losing context.",
  },
  {
    title: "Activity stream",
    description: "Review the latest comments, updates, and movement from one dark control surface.",
  },
];

const faqItems = [
  {
    question: "What is Taskflow built for?",
    answer: "Taskflow is built for teams that want project visibility in a compact, focused workspace.",
  },
  {
    question: "Can I track work across stages?",
    answer: "Yes. You can organize projects, create tasks, move them across board columns, and monitor updates from one place.",
  },
  {
    question: "Does the interface stay consistent across screens?",
    answer: "Yes. Navigation, forms, cards, and workspace views all follow the same dark dashboard system.",
  },
  {
    question: "How quickly can I get started?",
    answer: "Create an account, open a workspace, and start tracking work in a few minutes.",
  },
];

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
      <p className="text-sm font-semibold text-white/85">{title}</p>
      <p className="mt-3 text-sm leading-7 text-white/45">{description}</p>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open dashboard" : "Create account";
  const secondaryHref = user ? "/dashboard" : "/login";
  const secondaryLabel = user ? "Review projects" : "Sign in";

  return (
    <main className="min-h-screen bg-[#0f1117] text-white">
      <header className="border-b border-white/[0.07] bg-[#13161f]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
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

          <nav className="hidden items-center gap-6 text-sm text-white/45 md:flex">
            <Link href="#features" className="transition hover:text-white/80">Features</Link>
            <Link href="#workflow" className="transition hover:text-white/80">Workflow</Link>
            <Link href="#faq" className="transition hover:text-white/80">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={secondaryHref}
              className="hidden h-8 items-center rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 transition hover:border-white/20 hover:text-white sm:flex"
            >
              {secondaryLabel}
            </Link>
            <Link
              href={primaryHref}
              className="flex h-8 items-center rounded-lg bg-indigo-500 px-4 text-xs font-semibold text-white transition hover:bg-indigo-400"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/70">
              Focused project control
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
              A streamlined workspace for projects, tasks, and team activity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/45 sm:text-lg">
              Taskflow keeps planning, execution, and updates inside one consistent dashboard-style interface built to stay readable as work grows.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={primaryHref}
                className="flex h-10 items-center justify-center rounded-lg bg-indigo-500 px-5 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                {primaryLabel}
              </Link>
              <Link
                href="#features"
                className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-5 text-sm font-medium text-white/65 transition hover:border-white/20 hover:text-white"
              >
                Explore the interface
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/25">Projects</p>
                <p className="mt-2 text-2xl font-semibold text-white/90">Structured</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/25">Tasks</p>
                <p className="mt-2 text-2xl font-semibold text-white/90">Trackable</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/25">Updates</p>
                <p className="mt-2 text-2xl font-semibold text-white/90">Visible</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
                Dashboard preview
              </p>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/30">
                Taskflow
              </span>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-xl border border-white/[0.07] bg-[#13161f] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Navigation</p>
                <div className="mt-4 grid gap-2">
                  {[
                    "Dashboard",
                    "Projects",
                    "Activity",
                    "Team",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        index === 0
                          ? "bg-white/[0.07] text-white"
                          : "text-white/40"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-xl border border-white/[0.07] bg-[#13161f] p-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Projects</p>
                    <span className="text-[11px] text-white/25">3 total</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {[
                      "Website relaunch",
                      "Customer onboarding",
                      "Launch checklist",
                    ].map((item) => (
                      <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-[#13161f] p-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">Activity</p>
                    <span className="text-[11px] text-white/25">Latest</span>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-white/50">
                    <p><span className="text-white/80">Avery</span> created task QA due dates</p>
                    <p><span className="text-white/80">Nina</span> commented on launch checklist</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/70">
              Built for the workspace
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white/90 sm:text-4xl">
              One interface system for planning, execution, and review.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/45 sm:text-base">
              From the homepage to project views and board interactions, Taskflow stays compact, dark, and intentionally consistent.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                Task board
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    label: "Todo",
                    items: ["Hero copy", "Review roadmap"],
                  },
                  {
                    label: "In Progress",
                    items: ["Polish dashboard", "Fix due dates"],
                  },
                  {
                    label: "Done",
                    items: ["Activity feed", "Comments refresh"],
                  },
                ].map((column) => (
                  <div key={column.label} className="rounded-xl border border-white/[0.07] bg-[#13161f] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                      {column.label}
                    </p>
                    <div className="mt-4 grid gap-2">
                      {column.items.map((item) => (
                        <div key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/75">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                  Focus filters
                </p>
                <div className="mt-4 grid gap-2 text-sm text-white/50">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">Priority: High</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">Due in 7 days</div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">Label: Launch</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/25">
                  Why it works
                </p>
                <p className="mt-4 text-sm leading-7 text-white/45">
                  A stable visual language reduces context switching, so teams can focus on the work instead of re-learning the interface on every page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl rounded-xl border border-white/[0.07] bg-[#13161f] p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/70">
              Workflow
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white/90">
              Start in a project, move tasks across lanes, and keep updates in one place.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Create a project", "Open a workspace and define the work that needs to move."],
              ["02", "Track board flow", "Create tasks, apply filters, and keep priorities visible."],
              ["03", "Review activity", "Use comments and updates to keep execution aligned."],
            ].map(([step, title, description]) => (
              <div key={step} className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300/70">{step}</p>
                <h3 className="mt-3 text-lg font-semibold text-white/85">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/45">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300/70">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white/90">
              Common questions about the workspace.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-xl border border-white/[0.07] bg-[#1a1d27] p-6">
                <h3 className="text-lg font-semibold text-white/85">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-white/45">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

