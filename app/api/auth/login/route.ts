import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { validateAdminBootstrap } from "@/lib/admin-bootstrap";

type LoginPayload = {
  email?: string;
  password?: string;
  adminSetupToken?: string;
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
  const adminSetupToken =
    typeof payload?.adminSetupToken === "string"
      ? payload.adminSetupToken
      : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Invalid email or password." },
      { status: 400 },
    );
  }

  try {
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

    let role = user.role;
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

      const promotedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
        select: { role: true },
      });
      role = promotedUser.role;
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
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