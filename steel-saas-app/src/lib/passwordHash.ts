// bcryptjs is CommonJS; use default import so this module works in both
// Vite/Vitest (CJS interop) and Node.js native ESM (tsx, prisma seed).
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
