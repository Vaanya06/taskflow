import crypto from "crypto";

export function validateAdminBootstrap(email: string, token: string) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!adminEmail || !expectedToken) {
    return null;
  }

  const candidateBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);
  const tokenMatches =
    candidateBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, expectedBuffer);

  return email === adminEmail && tokenMatches;
}
