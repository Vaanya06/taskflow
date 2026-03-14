import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "./register-form";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Taskflow
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="text-sm text-zinc-500">
            Start organizing projects in minutes.
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link className="font-semibold text-zinc-900" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
