import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/database-errors";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export const SESSION_COOKIE = "taskflow_session";
const SESSION_TTL_DAYS = 7;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiresAt();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  try {
    await prisma.session.deleteMany({
      where: {
        tokenHash,
      },
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.warn("Skipping session delete because the database connection is unavailable.");
      return;
    }

    throw error;
  }
}

export async function getUserBySessionToken(
  token: string | null | undefined,
): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  let session:
    | {
        id: string;
        expiresAt: Date;
        user: AuthUser;
      }
    | null;

  try {
    session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.warn("Session lookup failed because the database connection is unavailable.");
      return null;
    }

    throw error;
  }

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    try {
      await prisma.session.delete({
        where: {
          id: session.id,
        },
      });
    } catch (error) {
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }
    }

    return null;
  }

  return session.user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  return getUserBySessionToken(token);
}