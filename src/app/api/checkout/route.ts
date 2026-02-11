import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { corsHeaders, isOriginAllowed, jsonError } from "@/lib/cors";
import { getStripeClient } from "@/lib/stripe";


import {
  getStripePriceAllowlist,
  validateStripePriceId
} from "@/lib/stripe-price-allowlist";

export const runtime = "nodejs";

const MAX_QUANTITY = 99;
const MAX_LINE_ITEMS = 50;
const MAX_METADATA_KEY_LENGTH = 40;
const MAX_METADATA_VALUE_LENGTH = 500;
const MAX_METADATA_ENTRIES = 50;

interface CheckoutItem {
  priceId: string;
  quantity: number;
}

interface CheckoutPayload {
  items: CheckoutItem[];
  customerEmail?: string;
  metadata?: Record<string, unknown>;
}

interface ValidationResult {
  payload?: CheckoutPayload;
  error?: string;
}

function getRequiredUrl(envName: "SUCCESS_URL" | "CANCEL_URL"): string | null {
  const value = process.env[envName]?.trim();

  if (!value) {
    return null;
  }

  try {
    new URL(value);
    return value;
  } catch {
    return null;
  }
}

function sanitizeMetadata(input?: Record<string, unknown>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  if (input) {
    for (const [rawKey, rawValue] of Object.entries(input)) {
      if (Object.keys(sanitized).length >= MAX_METADATA_ENTRIES - 1) {
        break;
      }

      if (rawValue === null || rawValue === undefined) {
        continue;
      }

      const key = rawKey.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, MAX_METADATA_KEY_LENGTH);

      if (!key || key === "source") {
        continue;
      }

      sanitized[key] = String(rawValue).slice(0, MAX_METADATA_VALUE_LENGTH);
    }
  }

  sanitized.source = "framer";
  return sanitized;
}

function validatePayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const itemsInput = body.items;

  if (!Array.isArray(itemsInput) || itemsInput.length === 0) {
    return { error: "items must be a non-empty array." };
  }

  if (itemsInput.length > MAX_LINE_ITEMS) {
    return { error: `items must not exceed ${MAX_LINE_ITEMS} line items.` };
  }

  const parsedItems: CheckoutItem[] = [];

  for (const [index, item] of itemsInput.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { error: `items[${index}] must be an object.` };
    }

    const itemObject = item as Record<string, unknown>;
    const priceId = itemObject.priceId;
    const quantity = itemObject.quantity;

    if (typeof priceId !== "string") {
      return { error: `items[${index}].priceId must be a string.` };
    }

    const priceIdError = validateStripePriceId(priceId);

    if (priceIdError) {
      return { error: `items[${index}].${priceIdError}` };
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return { error: `items[${index}].quantity must be an integer between 1 and 99.` };
    }

    parsedItems.push({
      priceId: priceId.trim(),
      quantity
    });
  }

  let customerEmail: string | undefined;
  const customerEmailInput = body.customerEmail;

  if (customerEmailInput !== undefined) {
    if (typeof customerEmailInput !== "string") {
      return { error: "customerEmail must be a string when provided." };
    }

    const trimmedEmail = customerEmailInput.trim();

    if (trimmedEmail.length > 0) {
      customerEmail = trimmedEmail;
    }
  }

  let metadata: Record<string, unknown> | undefined;
  const metadataInput = body.metadata;

  if (metadataInput !== undefined) {
    if (!metadataInput || typeof metadataInput !== "object" || Array.isArray(metadataInput)) {
      return { error: "metadata must be an object when provided." };
    }

    metadata = metadataInput as Record<string, unknown>;
  }

  return {
    payload: {
      items: parsedItems,
      customerEmail,
      metadata
    }
  };
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  if (!isOriginAllowed(request)) {
    return jsonError("Forbidden origin.", 403, request);
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isOriginAllowed(request)) {
    return jsonError("Forbidden origin.", 403, request);
  }

  const successUrl = getRequiredUrl("SUCCESS_URL");
  const cancelUrl = getRequiredUrl("CANCEL_URL");

  if (!successUrl || !cancelUrl) {
    return jsonError(
      "Server misconfigured: SUCCESS_URL and CANCEL_URL must be valid absolute URLs.",
      500,
      request
    );
  }

  const allowlist = getStripePriceAllowlist();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request body.", 400, request);
  }

  const validation = validatePayload(body);

  if (!validation.payload) {
    return jsonError(validation.error ?? "Invalid request payload.", 400, request);
  }

  if (allowlist.enforce) {
    if (allowlist.allowedPriceIds.size === 0) {
      return jsonError(
        "Server misconfigured: ENFORCE_STRIPE_PRICE_ALLOWLIST is enabled but ALLOWED_STRIPE_PRICE_IDS is empty.",
        500,
        request
      );
    }

    const invalidIds = validation.payload.items
      .map((item) => item.priceId)
      .filter((priceId) => !allowlist.allowedPriceIds.has(priceId));

    if (invalidIds.length > 0) {
      console.warn(
        JSON.stringify({
          event: "checkout_rejected_price_not_allowlisted",
          invalidIds
        })
      );
      return jsonError("Cart contains invalid items.", 400, request);
    }
  } else if (allowlist.allowedPriceIds.size > 0) {
    const invalidIds = validation.payload.items
      .map((item) => item.priceId)
      .filter((priceId) => !allowlist.allowedPriceIds.has(priceId));

    if (invalidIds.length > 0) {
      console.warn(
        JSON.stringify({
          event: "checkout_warning_price_not_allowlisted",
          invalidIds
        })
      );
    }
  }

  const metadata = sanitizeMetadata(validation.payload.metadata);
  metadata.default_currency = (process.env.DEFAULT_CURRENCY?.trim() || "gbp").slice(
    0,
    MAX_METADATA_VALUE_LENGTH
  );

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: validation.payload.items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity
    })),
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata
  };

  if (validation.payload.customerEmail) {
    params.customer_email = validation.payload.customerEmail;
  }

  let session: Stripe.Checkout.Session;
  const idempotencyKeyHeader = request.headers.get("idempotency-key");
  const idempotencyKey =
    idempotencyKeyHeader && idempotencyKeyHeader.trim().length > 0
      ? idempotencyKeyHeader.trim().slice(0, 255)
      : undefined;

  try {
    session = await getStripeClient().checkout.sessions.create(params, {
      idempotencyKey
    });
    console.log(
      JSON.stringify({
        event: "checkout_session_created",
        sessionId: session.id,
        hasIdempotencyKey: Boolean(idempotencyKey)
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "checkout_session_create_failed",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );

    return jsonError("Failed to create checkout session.", 500, request);
  }

  if (!session.url) {
    return jsonError("Stripe session was created without a redirect URL.", 500, request);
  }

  return NextResponse.json({ url: session.url, id: session.id }, { headers: corsHeaders(request) });
}
