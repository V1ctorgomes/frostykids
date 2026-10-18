import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "frostykids_session";
const COOKIE_MAX_AGE = 60 * 60 * 16; // 16 horas (dia do evento)

function getSessionSecret() {
  return process.env.SESSION_SECRET?.trim() || "";
}

function sign(value: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET_MISSING");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function authConfigError() {
  if (!process.env.APP_PASSWORD?.trim()) {
    return "APP_PASSWORD não está configurada na Vercel.";
  }
  if (!process.env.SESSION_SECRET?.trim()) {
    return "SESSION_SECRET não está configurada na Vercel.";
  }
  return null;
}

export function verifyPassword(password: string) {
  const expected = process.env.APP_PASSWORD?.trim();
  if (!expected) {
    return false;
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export async function createSession() {
  const token = `ok.${Date.now()}`;
  const signature = sign(token);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, `${token}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  if (!value) {
    return false;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [prefix, timestamp, signature] = parts;
  const token = `${prefix}.${timestamp}`;
  const expected = sign(token);

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return false;
    }
  } catch {
    return false;
  }

  return prefix === "ok";
}

export async function requireAuth() {
  const ok = await isAuthenticated();
  if (!ok) {
    throw new Error("UNAUTHORIZED");
  }
}
