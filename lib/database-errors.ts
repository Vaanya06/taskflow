import { Prisma } from "@prisma/client";

const DATABASE_CONNECTION_ERROR_CODES = new Set(["P1001", "P1017"]);
const DATABASE_CONNECTION_ERROR_MESSAGES = [
  "Connection terminated due to connection timeout",
  "Connection terminated unexpectedly",
  "Server has closed the connection",
  "timeout expired",
  "Can't reach database server",
  "Timed out fetching a new connection",
];

function collectErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current && !seen.has(current)) {
    seen.add(current);

    if (current instanceof Error) {
      if (current.message) {
        messages.push(current.message);
      }
      current = "cause" in current ? current.cause : undefined;
      continue;
    }

    break;
  }

  return messages;
}

export function isDatabaseConnectionError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    DATABASE_CONNECTION_ERROR_CODES.has(error.code)
  ) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const messages = collectErrorMessages(error);
  return messages.some((message) =>
    DATABASE_CONNECTION_ERROR_MESSAGES.some((fragment) => message.includes(fragment)),
  );
}