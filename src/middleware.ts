import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "frostykids_session";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toHex(signature);
}

async function isValidSession(value: string | undefined, secret: string) {
  if (!value || !secret) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const [prefix, timestamp, signature] = parts;
  if (prefix !== "ok") return false;

  const token = `${prefix}.${timestamp}`;
  const expected = await sign(token, secret);
  return safeEqual(signature, expected);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = await isValidSession(session, secret);

  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/controle", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(authenticated ? "/controle" : "/login", request.url),
    );
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/controle/:path*", "/cadastro/:path*"],
};
