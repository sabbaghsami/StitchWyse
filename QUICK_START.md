# 🚀 Quick Start: Stripe Checkout Integration

## What We Built

You now have a complete Stripe checkout system:
- ✅ **Backend API** (Next.js in this repo)
- ✅ **Stripe Checkout Handler** (Framer code component)
- ✅ **Integration Guide** (see INTEGRATION_GUIDE.md)

## Your Next 3 Actions

### 1️⃣ Get Stripe Test Keys (5 minutes)

```bash
# 1. Go to https://dashboard.stripe.com/test/apikeys
# 2. Copy your "Secret key" (starts with sk_test_)
# 3. Update .env.local:
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

### 2️⃣ Start Your Backend (2 minutes)

```bash
cd /Users/sami.sabbagh/git/StitchWyse1
npm install
npm run dev
```

Visit http://localhost:3000/api/health - you should see `{"status":"ok"}`

### 3️⃣ Create Your First Stripe Product (3 minutes)

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Name: "Test Beanie", Price: £25.00
4. Save and **copy the Price ID** (starts with `price_`)
5. You'll need this Price ID for your Framer products

## Quick Test Flow

Once you have a Stripe Price ID:

1. **In Framer:**
   - Open your FilteredProductsGrid component
   - Add a `stripePriceId` field to one product
   - Update the `onCheckout` handler (see docs/framer-integration-example.tsx)

2. **Test locally:**
   - Add product to cart
   - Click checkout
   - Should redirect to Stripe with test card: `4242 4242 4242 4242`

## File Structure

```
StitchWyse1/
├── src/
│   ├── app/api/
│   │   ├── checkout/route.ts    ← Creates Stripe sessions
│   │   ├── webhook/route.ts     ← Handles payment events
│   │   └── health/route.ts      ← Health check
│   └── lib/
│       ├── stripe.ts            ← Stripe client
│       └── cors.ts              ← CORS handling
├── docs/
│   ├── framer-checkout-client.ts        ← Client-side logic reference
│   ├── framer-integration-example.tsx   ← How to update your Framer code
│   └── go-live-checklist.md            ← Production checklist
├── .env.local                   ← Your local config (add Stripe keys here)
├── INTEGRATION_GUIDE.md         ← Full step-by-step guide
└── QUICK_START.md              ← This file
```

## Framer Components

You now have a **StripeCheckoutHandler** component in Framer:
- **ID:** `yHIZ5Ge`
- **Insert URL:** `https://framer.com/m/StripeCheckoutHandler-PSTeS5.js`
- **Export:** `createStripeCheckout()` function

Import it in your FilteredProductsGrid:
```typescript
import { createStripeCheckout } from "https://framer.com/m/StripeCheckoutHandler-PSTeS5.js"
```

## Common Questions

**Q: Do I need to add the StripeCheckoutHandler component to my canvas?**
A: No! It's a utility component. Just import and call `createStripeCheckout()` in your code.

**Q: Where do I get Stripe Price IDs?**
A: Create products in Stripe Dashboard → Products. Each product has a Price ID (e.g., `price_1abc...`)

**Q: Can I test without deploying?**
A: Yes! Run the backend locally (`npm run dev`) and use `http://localhost:3000` as your API URL.

**Q: What happens after payment?**
A: User is redirected to your success page (e.g., `/success`). Create this page in Framer.

## Need Help?

1. Check the detailed **INTEGRATION_GUIDE.md**
2. See the code example in **docs/framer-integration-example.tsx**
3. Review the **docs/go-live-checklist.md** before going live

## Deploy When Ready

```bash
# Push to GitHub
git init
git add .
git commit -m "Stripe checkout backend"
git push -u origin main

# Then deploy to Vercel (see INTEGRATION_GUIDE.md Step 8)
```

---

**Your vision:** User clicks checkout on Framer → Redirects to Stripe → Pays → Returns to success page ✨