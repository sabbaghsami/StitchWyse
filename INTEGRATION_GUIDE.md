# 🎯 Stripe + Framer Integration Guide

## ✅ What We've Done

1. ✅ Created `.env.local` for local backend testing
2. ✅ Created `StripeCheckoutHandler.tsx` code component in Framer (ID: `yHIZ5Ge`)

## 📋 Next Steps

### Step 1: Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Switch to **Test Mode** (toggle in top right)
3. Go to **Developers → API Keys**
4. Copy your **Secret key** (starts with `sk_test_`)
5. Update `.env.local`:
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   ```

### Step 2: Create Stripe Products

For each product in your Framer store, create a Stripe Price:

1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Fill in:
   - **Name**: e.g., "Cozy Beanie"
   - **Description**: Optional
   - **Price**: e.g., 25.00 GBP
   - **Recurring**: Leave unchecked (one-time payment)
4. Click **Save product**
5. **Copy the Price ID** (starts with `price_`)
6. Add this Price ID to your product in Framer (see Step 4)

### Step 3: Test Backend Locally

```bash
cd /Users/sami.sabbagh/git/StitchWyse1

# Install dependencies
npm install

# Start the server
npm run dev

# Test the health endpoint (in a new terminal)
curl http://localhost:3000/api/health
```

You should see: `{"status":"ok"}`

### Step 4: Update Your Framer Products

Your products need a `stripePriceId` field. Update the FilteredProductsGrid component's products array:

**Current structure:**
```typescript
{
  name: "Cozy Beanie",
  price: "£25.00",
  category: "beanies",
  image: "https://...",
  link: "/products/cozy-beanie"
}
```

**NEW structure (add stripePriceId):**
```typescript
{
  name: "Cozy Beanie",
  price: "£25.00",
  stripePriceId: "price_1234567890abcdef",  // ← Add this!
  category: "beanies",
  image: "https://...",
  link: "/products/cozy-beanie"
}
```

### Step 5: Update FilteredProductsGrid to Use Stripe

You need to update the FilteredProductsGrid component to call the Stripe checkout handler. Here's what to change:

1. Import the Stripe checkout function at the top:
   ```typescript
   import { createStripeCheckout } from "https://framer.com/m/StripeCheckoutHandler-PSTeS5.js"
   ```

2. Update the `onCheckout` handler in the CartDrawer to call Stripe instead of opening a link:
   ```typescript
   onCheckout={async () => {
       try {
           await createStripeCheckout(cart, {
               apiBaseUrl: "http://localhost:3000", // For local testing
               successUrl: "http://localhost:3000/success",
               cancelUrl: "http://localhost:3000/products",
               customerEmail: undefined, // Optional
           })
       } catch (error) {
           alert(error.message || "Checkout failed. Please try again.")
       }
   }}
   ```

### Step 6: Create Success & Cancel Pages in Framer

1. **Success Page** (`/success`):
   - Add a new page in Framer
   - Set path to `/success`
   - Add content: "Thank you for your order! 🎉"
   - Optionally display `session_id` from URL query params

2. **Cancel Page**:
   - Your `/products` page already exists
   - Users will return here if they cancel checkout

### Step 7: Test Locally with Stripe CLI

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook

# Copy the webhook signing secret (whsec_...) to .env.local
# Then restart your server: npm run dev

# Test a checkout in another terminal
stripe trigger checkout.session.completed
```

### Step 8: Deploy Backend to Vercel

1. Push your backend to GitHub:
   ```bash
   cd /Users/sami.sabbagh/git/StitchWyse1
   git init
   git add .
   git commit -m "Initial commit: Stripe checkout backend"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click **New Project**
4. Import your GitHub repo
5. **Add Environment Variables**:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ALLOWED_ORIGIN=https://your-site.framer.website
   SUCCESS_URL=https://your-site.framer.website/success?session_id={CHECKOUT_SESSION_ID}
   CANCEL_URL=https://your-site.framer.website/products
   DEFAULT_CURRENCY=gbp
   ENFORCE_STRIPE_PRICE_ALLOWLIST=false
   ```
6. Click **Deploy**
7. Copy your Vercel URL (e.g., `https://your-backend.vercel.app`)

### Step 9: Update Framer with Production URLs

In your FilteredProductsGrid, update the API URL:
```typescript
apiBaseUrl: "https://your-backend.vercel.app"
successUrl: "https://your-site.framer.website/success"
cancelUrl: "https://your-site.framer.website/products"
```

### Step 10: Configure Stripe Webhook (Production)

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Endpoint URL: `https://your-backend.vercel.app/api/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (optional)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Vercel Environment Variables as `STRIPE_WEBHOOK_SECRET`
8. Redeploy your Vercel app

### Step 11: Test End-to-End

1. Go to your Framer site
2. Add items to cart
3. Click "Checkout"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Any expiry date in the future
6. Any 3-digit CVC
7. Complete payment
8. Should redirect to your success page

## 🎉 You're Live!

Once test mode works, switch to live mode:
1. Toggle **Live Mode** in Stripe Dashboard
2. Get your **live** API keys (starts with `sk_live_`)
3. Create **live** products and prices
4. Update Vercel environment variables with live keys
5. Update Framer products with live `stripePriceId` values

## 🔧 Troubleshooting

### "Cart contains invalid items"
- Check that all products have valid Stripe Price IDs
- Verify Price IDs exist in your Stripe account
- Make sure you're using the correct mode (test vs live)

### "Forbidden origin"
- Update `ALLOWED_ORIGIN` in Vercel to match your Framer site URL
- Include the full URL with `https://`

### Webhook not firing
- Check Vercel logs for incoming webhook calls
- Verify webhook endpoint is correct in Stripe Dashboard
- Ensure `STRIPE_WEBHOOK_SECRET` matches the one from Stripe

## 📚 Resources

- [Backend Repo](/Users/sami.sabbagh/git/StitchWyse1)
- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Go-Live Checklist](/Users/sami.sabbagh/git/StitchWyse1/docs/go-live-checklist.md)