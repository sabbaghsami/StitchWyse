import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { corsHeaders, isOriginAllowed, jsonError } from "@/lib/cors";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function getWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
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
  if (!isOriginAllowed(request)) {
    return jsonError("Forbidden origin.", 403, request);
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isOriginAllowed(request)) {
    return jsonError("Forbidden origin.", 403, request);
  }

  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    return jsonError("Server misconfigured: missing STRIPE_WEBHOOK_SECRET.", 500, request);
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe-Signature header.", 400, request);
  }

  const rawBody = await request.text();

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
          sessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
          email: session.customer_details?.email ?? null,
          customerName: session.customer_details?.name ?? null,
          customerPhone: session.customer_details?.phone ?? null,
          shipping: session.shipping_details
            ? {
                name: session.shipping_details.name ?? null,
                phone: session.shipping_details.phone ?? null,
                address: session.shipping_details.address ?? null
              }
            : null,
          lineItems: lineItems
            ? lineItems.data.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                amountSubtotal: item.amount_subtotal,
                amountTotal: item.amount_total,
                currency: item.currency,
                priceId: item.price?.id ?? null
              }))
            : null,
          metadata: session.metadata ?? {}
        })
      );

      break;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      console.log(
        JSON.stringify({
          event: "payment_intent.succeeded",
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata ?? {}
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
