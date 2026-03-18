import Link from "next/link";
import type { ReactNode } from "react";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  badge?: string;
  active?: boolean;
  icon:
    | "dashboard"
    | "folder"
    | "activity"
    | "team"
    | "reports"
    | "home"
    | "board";
};

type WorkspaceShellProps = {
  title: string;
  navItems: WorkspaceNavItem[];
  userName: string;
  userEmail: string;
  userAction?: ReactNode;
  topbarRight?: ReactNode;
  children: ReactNode;
};

function ShellIcon({ icon }: { icon: WorkspaceNavItem["icon"] }) {
  switch (icon) {
    case "folder":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M1.5 4.5C1.5 3.67 2.17 3 3 3h3l1.5 1.5H12c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5H3c-.83 0-1.5-.67-1.5-1.5v-6Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "activity":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <polyline points="1,9 4,4.5 7,9.5 10,5 14,8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case "team":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M13 12c0-1.5-1-2.5-2-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "reports":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.5 9.5V11M7.5 7v4M10.5 4.5v6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "home":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.2 6.4 7.5 2.4l5.3 4v5.1c0 .66-.54 1.2-1.2 1.2H3.4c-.66 0-1.2-.54-1.2-1.2V6.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M5.7 12.7V8.8h3.6v3.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "board":
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1.8" y="2" width="3.2" height="10.8" rx="0.9" stroke="currentColor" strokeWidth="1.2" />
          <rect x="5.9" y="2" width="3.2" height="7.6" rx="0.9" stroke="currentColor" strokeWidth="1.2" />
          <rect x="10" y="2" width="3.2" height="9.2" rx="0.9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
  }
}

export function WorkspaceShell({
  title,
  navItems,
  userName,
  userEmail,
  userAction,
  topbarRight,
  children,
}: WorkspaceShellProps) {
  const initials = (userName || userEmail || "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#081218] text-white lg:flex-row">
      <aside className="relative flex w-full shrink-0 flex-col overflow-hidden border-b border-white/[0.08] bg-[rgba(7,18,25,0.86)] lg:w-[250px] lg:border-b-0 lg:border-r">
        <div className="pointer-events-none absolute inset-0 surface-grid opacity-[0.12]" />

        <div className="relative flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(62,214,177,0.95),rgba(127,211,247,0.85))] text-[#05231d] shadow-[0_16px_32px_rgba(62,214,177,0.22)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.68" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity="0.32" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Taskflow</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                Flow OS
              </p>
            </div>
          </Link>

          <span className="badge-pill hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
            Live
          </span>
        </div>

        <div className="relative px-4 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/26">
            Workspace
          </p>
        </div>

        <nav className="relative flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition ${
                item.active
                  ? "border-[#8eead4]/20 bg-[linear-gradient(135deg,rgba(62,214,177,0.2),rgba(127,211,247,0.08))] text-white shadow-[0_18px_40px_rgba(7,18,25,0.18)]"
                  : "border-transparent text-white/48 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white/80"
              }`}
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${
                  item.active
                    ? "bg-black/20 text-[var(--accent)]"
                    : "bg-white/[0.04] text-white/55 group-hover:bg-white/[0.07]"
                }`}
              >
                <ShellIcon icon={item.icon} />
              </span>
              <span className="flex-1 font-medium">{item.label}</span>
              {item.badge ? (
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                    item.active
                      ? "bg-black/20 text-[var(--accent)]"
                      : "border border-white/10 bg-white/5 text-white/45"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="relative mx-3 mb-3 mt-auto rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="pointer-events-none absolute inset-0 surface-grid opacity-[0.08]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/28">
              Signed in
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(62,214,177,0.18),rgba(127,211,247,0.22))] text-xs font-semibold text-[var(--accent)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/84">{userName}</p>
                <p className="truncate text-xs text-white/36">{userEmail}</p>
              </div>
              {userAction}
            </div>
            <p className="mt-4 text-xs leading-6 text-white/34">
              Boards, deadlines, and activity all stay in sync from here.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="relative flex min-h-16 shrink-0 flex-col gap-3 border-b border-white/[0.08] bg-[rgba(7,18,25,0.76)] px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/28">
              Workspace view
            </p>
            <h1 className="display-font text-3xl text-white/92">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">{topbarRight}</div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
