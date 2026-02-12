import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { corsHeaders, jsonError } from "@/lib/cors";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

interface ParsedContentLength {
  bytes: number | null;
  invalid: boolean;
}

type BodyReadResult = { ok: true; body: string } | { ok: false; reason: "too_large" | "invalid" };

function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function parseContentLength(headerValue: string | null): ParsedContentLength {
  if (headerValue === null) {
    return { bytes: null, invalid: false };
  }

  const trimmed = headerValue.trim();

  if (!/^\d+$/.test(trimmed)) {
    return { bytes: null, invalid: true };
  }

  const bytes = Number.parseInt(trimmed, 10);

  if (!Number.isSafeInteger(bytes)) {
    return { bytes: null, invalid: true };
  }

  return { bytes, invalid: false };
}

async function readRequestBodyWithLimit(request: Request, maxBytes: number): Promise<BodyReadResult> {
  const reader = request.body?.getReader();

  if (!reader) {
    return { ok: true, body: "" };
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }

      chunks.push(Buffer.from(value));
    }
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }

  return { ok: true, body: Buffer.concat(chunks, totalBytes).toString("utf8") };
}

function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

async function safeListCheckoutLineItems(
  stripe: Stripe,
  sessionId: string
): Promise<Stripe.ApiList<Stripe.LineItem> | null> {
  try {
    return await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "webhook_list_line_items_failed",
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    return null;
  }
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    return jsonError("Server misconfigured: missing STRIPE_WEBHOOK_SECRET.", 500, request);
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe-Signature header.", 400, request);
  }

  const contentLength = parseContentLength(request.headers.get("content-length"));

  if (contentLength.invalid) {
    return jsonError("Invalid Content-Length header.", 400, request);
  }

  if (contentLength.bytes !== null && contentLength.bytes > MAX_WEBHOOK_BODY_BYTES) {
    return jsonError("Payload too large.", 413, request);
  }

  const bodyRead = await readRequestBodyWithLimit(request, MAX_WEBHOOK_BODY_BYTES);

  if (!bodyRead.ok) {
    if (bodyRead.reason === "too_large") {
      return jsonError("Payload too large.", 413, request);
    }

    console.error(
      JSON.stringify({
        event: "webhook_body_read_failed"
      })
    );
    return jsonError("Invalid webhook request body.", 400, request);
  }

  const rawBody = bodyRead.body;

  let event: Stripe.Event;
  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "webhook_signature_verification_failed",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    );
    return jsonError("Invalid webhook signature.", 400, request);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const lineItems = session.id ? await safeListCheckoutLineItems(stripe, session.id) : null;

      console.log(
        JSON.stringify({
          event: "checkout.session.completed",
          eventId: event.id,
          sessionId: session.id,
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
          amountTotal: session.amount_total,
          currency: session.currency,
          customerId: extractCustomerId(session.customer),
          lineItems: lineItems
            ? lineItems.data.map((item) => ({
                quantity: item.quantity,
                priceId: item.price?.id ?? null
              }))
            : null
        })
      );

      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log(
        JSON.stringify({
          event: "payment_intent.succeeded",
          eventId: event.id,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          customerId: extractCustomerId(paymentIntent.customer)
        })
      );

      break;
    }
    default: {
      console.log(
        JSON.stringify({
          event: "webhook_unhandled_event",
          type: event.type,
          id: event.id
        })
      );
    }
  }

  return NextResponse.json({ received: true }, { headers: corsHeaders(request) });
}
