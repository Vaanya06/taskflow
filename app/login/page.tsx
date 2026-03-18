import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/app/auth-frame";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthFrame
      eyebrow="Sign in"
      title="Welcome back to the board"
      description="Open your workspace, catch the current sprint pulse, and jump back into the tasks that need your attention first."
      footer={
        <p>
          New here?{" "}
          <Link className="font-semibold text-[var(--accent)] transition hover:text-white" href="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthFrame>
  );
}