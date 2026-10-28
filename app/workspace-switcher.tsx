import Link from "next/link";

type WorkspaceSwitcherProps = {
  current: "personal" | "projects";
};

export function WorkspaceSwitcher({ current }: WorkspaceSwitcherProps) {
  return (
    <nav
      aria-label="Workspaces"
      className="workspace-switcher w-full"
    >
      <Link
        href="/todos"
        aria-current={current === "personal" ? "page" : undefined}
        className={current === "personal" ? "workspace-switcher-active" : ""}
      >
        Personal tasks
      </Link>
      <Link
        href="/dashboard"
        aria-current={current === "projects" ? "page" : undefined}
        className={current === "projects" ? "workspace-switcher-active" : ""}
      >
        Team projects
      </Link>
    </nav>
  );
}
