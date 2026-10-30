import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { CompanyContext } from "@/app/company-tasks/company-context";

const employeeFeatures = [
  {
    number: "01",
    title: "Clear task assignments",
    description: "See who owns each task, what is expected, and when it is due in one shared workspace.",
  },
  {
    number: "02",
    title: "Progress you can measure",
    description: "Break work into checklist steps and follow completion as employees check off each item.",
  },
  {
    number: "03",
    title: "Stay in sync",
    description: "Share updates, track task status, and let administrators see employee availability.",
  },
];

const workflowSteps = [
  ["01", "Assign", "Administrators create a task, set a due date, and assign an employee."],
  ["02", "Complete steps", "Employees work through the task checklist and share progress updates."],
  ["03", "Track progress", "The team can see status, due dates, and checklist completion at a glance."],
] as const;

const faqItems = [
  {
    question: "Who can assign company tasks?",
    answer: "Administrators assign tasks to employees. Employees see their assigned work and update its progress.",
  },
  {
    question: "How is task progress measured?",
    answer: "When a task has checklist steps, progress is calculated from the steps the assigned employee completes. Tasks without a checklist use their status.",
  },
  {
    question: "Where can I learn about ILAMED?",
    answer: "Visit the official ILAMED website for information about the institute, its training programs, and educational offerings.",
  },
];

function AccountIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 17c.4-3 2.3-4.5 5.5-4.5s5.1 1.5 5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const accountHref = user ? (user.role === "ADMIN" ? "/admin" : "/company-tasks") : "/login";
  const primaryHref = user ? accountHref : "/register";
  const primaryLabel = user ? "Go to my account" : "Create account";

  return (
    <main className="home-theme">
      <header className="home-header sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
          <Link href="/" className="block w-fit rounded bg-white">
            <Image src="/ilamed-logo.png" alt="ILAMED — Institute of Laser & Aesthetic Medicine" width={2327} height={768} className="h-auto w-[min(30vw,300px)] min-w-[180px] object-contain" priority />
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-white/48 md:flex">
            <Link href="#about" className="transition hover:text-white/84">About ILAMED</Link>
            <Link href="#workspace" className="transition hover:text-white/84">Employee workspace</Link>
            <Link href="#workflow" className="transition hover:text-white/84">How it works</Link>
          </nav>

          <div className="flex items-center justify-self-end gap-2">
            {user ? (
              <Link
                href={accountHref}
                aria-label="My account"
                title="My account"
                className="accent-button flex h-10 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.12em]"
              >
                <AccountIcon />
                <span>My account</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="secondary-button hidden h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.18em] sm:flex">
                  Sign in
                </Link>
                <Link href="/register" className="accent-button flex h-10 items-center px-4 text-xs font-semibold uppercase tracking-[0.12em]">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pb-16 pt-14 sm:pb-20 sm:pt-18">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="section-kicker">Institute of Laser &amp; Aesthetic Medicine Training</p>
            <h1 className="display-font mt-5 max-w-4xl text-6xl leading-[0.96] text-white/96 sm:text-7xl">
              One place for ILAMED teams to move work forward.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
              Welcome to the ILAMED employee workspace. Find assigned responsibilities, due dates,
              checklist progress, and team updates in one clear place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="accent-button flex h-12 items-center justify-center gap-2 px-6 text-sm font-semibold uppercase tracking-[0.12em]">
                {user ? <AccountIcon /> : null}
                {primaryLabel}
              </Link>
              <Link href="#about" className="secondary-button flex h-12 items-center justify-center px-6 text-sm font-semibold uppercase tracking-[0.12em]">
                About ILAMED
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/58">
              <span className="badge-pill">Assigned responsibilities</span>
              <span className="badge-pill">Checklist progress</span>
              <span className="badge-pill">Shared visibility</span>
            </div>
          </div>

          <div className="panel-card float-gentle rounded-[34px] p-6 sm:p-7">
            <div className="surface-grid absolute inset-0 opacity-[0.08]" />
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">ILAMED employee workspace</p>
                <p className="mt-1 text-sm text-white/48">A shared view of the work ahead.</p>
              </div>
              <span className="badge-pill text-[10px] font-semibold text-[var(--accent)]">Task tracking</span>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                ["Assigned to an employee", "Clear ownership"],
                ["Due date and priority", "Know what needs attention"],
                ["Checklist completion", "Track each step"],
              ].map(([title, detail], index) => (
                <div key={title} className="flex items-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-4 py-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-semibold text-[var(--accent)]">
                    0{index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white/86">{title}</span>
                    <span className="mt-1 block text-xs text-white/40">{detail}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-white/38">
              Administrators assign and monitor work. Employees update their own task status and checklist.
            </p>
          </div>
        </div>
      </section>

      <section id="about" className="px-6 pb-16 sm:pb-20">
        <div className="panel-card mx-auto max-w-6xl rounded-[32px] p-6 sm:p-8">
          <p className="section-kicker">About ILAMED</p>
          <h2 className="display-font mt-3 text-3xl text-white/92">
            Supporting education in aesthetic medicine.
          </h2>
          <CompanyContext />
        </div>
      </section>

      <section id="workspace" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="section-kicker">Employee workspace</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.02] text-white/94">
              Keep company tasks simple and visible.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/48 sm:text-base">
              Focus on assigned work, communicate progress, and make the next step easy to see.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {employeeFeatures.map((feature) => (
              <div key={feature.number} className="panel-card-soft panel-hover rounded-[30px] p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(62,214,177,0.16),rgba(255,149,101,0.18))] text-sm font-semibold text-white/80">
                  {feature.number}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white/88">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/46">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl panel-card rounded-[34px] p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="section-kicker">How it works</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.04] text-white/94">
              Assign, complete, and track.
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
            <p className="section-kicker">Help</p>
            <h2 className="display-font mt-4 text-5xl leading-[1.04] text-white/94">
              Quick answers for employees.
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
