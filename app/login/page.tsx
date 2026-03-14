import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
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
      title="Welcome back"
      description="Open your workspace, review active projects, and continue task flow from the same focused dashboard interface."
      footer={
        <p>
          New here?{" "}
          <Link className="font-semibold text-white/75 transition hover:text-white" href="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthFrame>
  );
}
