import crypto from "crypto";

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(key, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedKey, derivedKey);
}
