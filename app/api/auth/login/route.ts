import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let payload: LoginPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user || !user.password) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
