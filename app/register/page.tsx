import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/app/auth-frame";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthFrame
      eyebrow="Create account"
      title="Start a brighter workspace"
      description="Create your account to organize projects, move work through the board, and keep sprint decisions visible from day one."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-semibold text-[var(--accent)] transition hover:text-white" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthFrame>
  );
}