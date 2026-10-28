import "./todo.css";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accessibleTodoListWhere, ensureInboxList } from "@/lib/todo-access";
import TodoWorkspace from "./todo-workspace";

export default async function TodosPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await ensureInboxList(user.id);
  const lists = await prisma.todoList.findMany({
    where: accessibleTodoListWhere(user.id),
    orderBy: [{ isInbox: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      isInbox: true,
      ownerId: true,
      _count: { select: { tasks: { where: { isCompleted: false } } } },
    },
  });

  return (
    <TodoWorkspace
      lists={lists}
      userId={user.id}
      userName={user.name || user.email}
      userEmail={user.email}
    />
  );
}
