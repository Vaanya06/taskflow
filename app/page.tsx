import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const features = [
  {
    title: "A day with room to breathe",
    description: "Choose what belongs in My Day, keep the rest in your lists, and finish without losing sight of tomorrow.",
  },
  {
    title: "Small steps, steady progress",
    description: "Add notes, due dates, reminders, repeat schedules, and checkable steps to the tasks that need more detail.",
  },
  {
    title: "Lists that work together",
    description: "Keep personal lists private or share one with another ILAMED user. Your project workspaces stay separate.",
  },
];

const rituals = [
  {
    title: "Capture it quickly",
    detail: "Drop a thought into your Inbox before it slips away, then organize it when you are ready.",
  },
  {
    title: "Make today yours",
    detail: "Bring a few tasks into My Day and keep your focus on what matters right now.",
  },
  {
    title: "Build a gentle rhythm",
    detail: "Set a reminder, repeat a routine, or break a larger task into smaller steps.",
  },
];

const workflowSteps = [
  ["01", "Capture", "Add a task to your Inbox or the list that fits it."],
  ["02", "Choose", "Set a date, add a reminder, or place it in My Day."],
  ["03", "Make progress", "Take one step at a time, and let recurring tasks handle the routines."],
] as const;

const faqItems = [
  {
    question: "What is ILAMED for?",
    answer: "ILAMED helps you organize everyday tasks with a focused day view, flexible lists, reminders, and recurring routines.",
  },
  {
    question: "Can I share a list?",
    answer: "Yes. List owners can share lists with other ILAMED accounts and remove access when it is no longer needed.",
  },
  {
    question: "What happens to project workspaces?",
    answer: "Projects remain available separately, so team boards and sprints do not get mixed into your personal task lists.",
  },
  {
    question: "How quickly can I get started?",
    answer: "Create an account and add your first task. Your Inbox and My Day are ready from the start.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? (user.role === "ADMIN" ? "/admin" : user.role === "MANAGER" ? "/dashboard" : "/todos") : "/register";
  const primaryLabel = user ? (user.role === "MANAGER" ? "Open projects" : "Open tasks") : "Create account";
  const secondaryHref = user ? "/dashboard" : "/login";
  const secondaryLabel = user ? "Open projects" : "Sign in";

  return (
    <main className="home-theme">
      <header className="home-header sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(99,102,241,0.95),rgba(167,139,250,0.84))] text-white shadow-[0_18px_34px_rgba(99,102,241,0.2)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.32" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-white">ILAMED</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Flow OS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/48 md:flex">
            <Link href="#features" className="transition hover:text-white/84">Features</Link>
            <Link href="#workflow" className="transition hover:text-white/84">Workflow</Link>
            <Link href="#faq" className="transition hover:text-white/84">FAQ</Link>
          </nav>

          <div className="flex items-center justify-self-end gap-2">
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
            <p className="section-kicker">A calmer way to keep track</p>
            <h1 className="display-font mt-5 max-w-4xl text-6xl leading-[0.96] text-white/96 sm:text-7xl">
              Make space for what matters today.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/50 sm:text-lg">
              Gather the little things and the big things in one gentle flow. Plan your day, build routines, and make progress at your own pace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="accent-button flex h-12 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.18em]">
                {primaryLabel}
              </Link>
              <Link href="#features" className="secondary-button flex h-12 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.18em]">
                See how it works
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/58">
              <span className="badge-pill">A focused My Day</span>
              <span className="badge-pill">Lists you can share</span>
              <span className="badge-pill">Routines that repeat</span>
            </div>
          </div>

          <div className="panel-card float-gentle rounded-[34px] p-6 sm:p-7">
            <div className="surface-grid absolute inset-0 opacity-[0.08]" />
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Live preview</p>
                <p className="mt-1 text-sm text-white/42">A softer place to land your next few tasks.</p>
              </div>
              <span className="badge-pill text-[10px] font-semibold text-[var(--accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
                Updated
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="panel-card-soft rounded-[28px] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">My Day · 3 tasks</p>
                <div className="mt-4 grid gap-3">
                  {[
                    ["Reply to the note", "Today"],
                    ["Pick up groceries", "Today"],
                    ["A short walk", "Every day"],
                  ].map(([title, detail], index) => (
                    <div key={title} className="flex items-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25 text-[var(--accent)]">
                        {index === 0 ? <span className="h-2 w-2 rounded-full bg-[var(--accent)]" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-white/86">{title}</span>
                        <span className="mt-1 block text-xs text-white/34">{detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="panel-card-soft rounded-[28px] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Keep it simple</p>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["Inbox", "Collect the things on your mind"],
                      ["Home", "Keep everyday life in one place"],
                      ["Shared", "Make plans together"],
                    ].map(([label, note]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                        <span className="text-sm font-semibold text-white/78">{label}</span>
                        <span className="text-right text-xs text-white/38">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["My Day", "Focused"],
                    ["Routines", "Steady"],
                    ["Lists", "Shared"],
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
            <p className="section-kicker">A little structure, no pressure</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.02] text-white/94">
              Everything you need to keep a thoughtful day moving.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/48 sm:text-base">
              Start with a simple list. Add just enough detail to help future-you follow through.
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">A rhythm that fits you</p>
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">Keep team projects in their place</p>
              <p className="mt-4 text-sm leading-7 text-white/46">
                Personal tasks have a quiet home of their own. Your existing project boards and sprints are still there when it is time to work with your team.
              </p>
              <div className="mt-5 grid gap-3">
                {[
                  "My Day for a clear daily focus",
                  "Flexible lists for personal routines",
                  "Projects stay available separately",
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
              A simple loop: capture, choose, and carry on.
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