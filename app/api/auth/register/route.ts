import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { validateAdminBootstrap } from "@/lib/admin-bootstrap";

type RegisterPayload = {
  name?: string;
  email?: string;
  password?: string;
  adminSetupToken?: string;
};

export async function POST(request: Request) {
  let payload: RegisterPayload | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const email =
    typeof payload?.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  const adminSetupToken =
    typeof payload?.adminSetupToken === "string"
      ? payload.adminSetupToken
      : "";

  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Invalid registration details." },
      { status: 400 },
    );
  }

  let role: "USER" | "ADMIN" = "USER";
  if (adminSetupToken) {
    const isValidAdminSetup = validateAdminBootstrap(email, adminSetupToken);
    if (isValidAdminSetup === null) {
      return NextResponse.json(
        { ok: false, error: "Admin setup is not configured on the server." },
        { status: 503 },
      );
    }

    if (!isValidAdminSetup) {
      return NextResponse.json(
        { ok: false, error: "Invalid admin setup details." },
        { status: 403 },
      );
    }

    role = "ADMIN";
  }

  try {
    const existing = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Email already in use." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: passwordHash,
        role,
      },
    });

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { ok: false, error: "Database temporarily unavailable. Please try again shortly." },
        { status: 503 },
      );
    }

    throw error;
  }
}