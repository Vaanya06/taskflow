import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
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
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-zinc-500">
            Log in to keep your projects moving.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-zinc-500">
          New here?{" "}
          <Link className="font-semibold text-zinc-900" href="/register">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
