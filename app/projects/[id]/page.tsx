import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.role === "ADMIN" ? "/admin" : "/company-tasks");
}
