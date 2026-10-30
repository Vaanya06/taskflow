import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import HomeAuthPanel from "@/app/home-auth-panel";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/company-tasks");

  return (
    <main className="home-theme flex min-h-screen items-center px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <Image
            src="/ilamed-logo.png"
            alt="ILAMED — Institute of Laser & Aesthetic Medicine"
            width={2327}
            height={768}
            className="h-auto w-[min(80vw,420px)] object-contain"
            priority
          />
          <p className="mt-8 max-w-xl text-lg font-medium leading-8 text-slate-600 sm:text-xl">
            Shaping Aesthetic Education Through Quality Training, Clinical Excellence and Trusted Expertise.
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            Institute of Laser &amp; Aesthetic Medicine Training
          </p>
        </section>

        <div className="mx-auto w-full max-w-lg">
          <HomeAuthPanel />
        </div>
      </div>
    </main>
  );
}
