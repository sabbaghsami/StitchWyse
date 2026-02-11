# Stripe Backend for Framer Cart (Next.js + Vercel)

Minimal, production-oriented Stripe backend for a Framer storefront cart using Next.js App Router route handlers.

## Endpoints

- `POST /api/checkout`
- `POST /api/webhook`
- `GET /api/health`

## Stack

- Next.js (App Router)
- TypeScript (strict)
- Stripe Node SDK (`stripe`)
- Vercel serverless deployment

## Environment Variables

Create `.env.local` for local dev (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Required:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUCCESS_URL`
- `CANCEL_URL`

Recommended:

- `ALLOWED_ORIGIN` (one or more allowed origins, comma-separated, e.g. `https://your-site.framer.website`)

Optional:

- `DEFAULT_CURRENCY` (defaults to `gbp`, useful as project-level default metadata/config)
- `ENFORCE_STRIPE_PRICE_ALLOWLIST` (defaults to `true` in production, `false` otherwise)
- `ALLOWED_STRIPE_PRICE_IDS` (comma-separated Stripe Price IDs allowed for checkout, required when enforcement is enabled)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start local server:

```bash
npm run dev
```

3. Health check:

```bash
curl -s http://localhost:3000/api/health
```

## Checkout API Contract

`POST /api/checkout` expects:

```json
{
  "items": [
    { "priceId": "price_123", "quantity": 2 },
    { "priceId": "price_456", "quantity": 1 }
  ],
  "customerEmail": "optional@email.com",
  "metadata": { "source": "framer", "note": "optional" }
}
```

Validation rules:

- `items` must exist and be a non-empty array
- each item needs:
  - `priceId`: non-empty string
  - `quantity`: integer `1..99`

Example test call:

```bash
curl -i http://localhost:3000/api/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-site.framer.website" \
  -d '{
    "items":[{"priceId":"price_123","quantity":2},{"priceId":"price_456","quantity":1}],
    "customerEmail":"buyer@example.com",
    "metadata":{"source":"framer","note":"first-order"}
  }'
```

Successful response:

```json
{
  "url": "https://checkout.stripe.com/c/pay/...",
  "id": "cs_test_..."
}
```

## Webhook Setup

Route: `POST /api/webhook`

Handled events:

- `checkout.session.completed`
- `payment_intent.succeeded` (optional logging)

### Local webhook testing with Stripe CLI

1. Forward Stripe events to local endpoint:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

2. Copy generated webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

3. Trigger an event:

```bash
stripe trigger checkout.session.completed
```

You should see structured JSON logs from the webhook handler in your terminal.

## Vercel Deployment

1. Push repo to Git provider.
2. Import project into Vercel (Framework Preset: Next.js).
3. Set environment variables in Vercel Project Settings:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `ALLOWED_ORIGIN`
   - `SUCCESS_URL`
   - `CANCEL_URL`
   - `DEFAULT_CURRENCY` (optional)
4. Deploy.
5. In Stripe Dashboard, configure webhook endpoint:
   - `https://<your-vercel-domain>/api/webhook`
   - subscribe to `checkout.session.completed` and optionally `payment_intent.succeeded`

## Framer Integration Notes

- Call `POST /api/checkout` from your Framer code component with cart JSON.
- Redirect the browser to the returned `url`.
- Do not expose `STRIPE_SECRET_KEY` in client-side code.
- Reference implementation:
  - `/Users/sami.sabbagh/git/StitchWyse1/docs/framer-checkout-client.ts`
  - `/Users/sami.sabbagh/git/StitchWyse1/docs/go-live-checklist.md`

## Security Notes

- Secret keys are server-only.
- Optional origin restriction via `ALLOWED_ORIGIN`.
- Webhook signatures are verified using raw request body and `STRIPE_WEBHOOK_SECRET`.
