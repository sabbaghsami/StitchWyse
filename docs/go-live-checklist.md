# Go-Live Checklist

## 1) Stripe setup

- Create all products and prices in Stripe.
- Ensure every storefront product has a valid `stripePriceId` (`price_...`).
- Keep test and live mode Price IDs separate.

## 2) Vercel environment variables

Set these in Vercel Project Settings:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ALLOWED_ORIGIN` (Framer origin, e.g. `https://your-site.framer.website`)
- `SUCCESS_URL`
- `CANCEL_URL`
- `DEFAULT_CURRENCY` (optional, default is `gbp`)

## 3) Stripe webhook endpoint

- Endpoint URL: `https://<your-vercel-domain>/api/webhook`
- Events:
  - `checkout.session.completed`
  - `payment_intent.succeeded` (optional but recommended)
- Copy webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

## 4) Framer checkout integration

- Use `/Users/sami.sabbagh/git/StitchWyse1/docs/framer-checkout-client.ts` in your Framer code component.
- Call `redirectToStripeCheckout()` on checkout button click.
- Pass cart items containing `stripePriceId` and `quantity`.

## 5) Success and cancel pages

- Ensure Framer routes exactly match:
  - `SUCCESS_URL`
  - `CANCEL_URL`
- Optional: read `session_id` query param on success page for customer support diagnostics.

## 6) End-to-end test (Stripe test mode)

- Add items to cart.
- Start checkout.
- Use test card `4242 4242 4242 4242`.
- Confirm:
  - redirect to Stripe and back to success URL
  - webhook logs appear in Vercel logs
  - cart clears after successful redirect

## 7) Live switch

- Replace test keys with live keys in Vercel.
- Replace test `price_...` IDs with live IDs in Framer content.
- Run one real low-value payment to verify live end-to-end flow.
