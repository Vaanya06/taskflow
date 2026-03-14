import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/AuthFrame";
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
      title="Start your workspace"
      description="Create your account to organize projects, move tasks through the board, and keep updates readable from day one."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-semibold text-white/75 transition hover:text-white" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthFrame>
  );
}
