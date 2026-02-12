import { NextResponse } from "next/server";

const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Stripe-Signature, Idempotency-Key";
const MAX_AGE_SECONDS = 60 * 60;

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN?.trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isOriginAllowed(request: Request): boolean {
  const configuredOrigins = parseAllowedOrigins();

  if (configuredOrigins.length === 0) {
    return true;
  }

  const originHeader = request.headers.get("origin");

  if (!originHeader) {
    return false;
  }

  return configuredOrigins.includes(originHeader);
}

export function corsHeaders(request?: Request): HeadersInit {
  const configuredOrigins = parseAllowedOrigins();
  const requestOrigin = request?.headers.get("origin") ?? null;
  const isConfigured = configuredOrigins.length > 0;

  const allowOrigin = isConfigured
    ? requestOrigin && configuredOrigins.includes(requestOrigin)
      ? requestOrigin
      : configuredOrigins[0]
    : "*";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": String(MAX_AGE_SECONDS)
  };

  if (isConfigured) {
    headers.Vary = "Origin";
  }

  return headers;
}

export function jsonError(message: string, status: number, request?: Request): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders(request) });
}
