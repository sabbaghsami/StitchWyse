# Custom Product Form Setup Guide

Your custom product configurator is ready! Follow these steps to set it up.

## What's Been Created

✅ **CustomProductForm.tsx** - Framer component (already in your project)
✅ **Backend API** - `/api/custom-order` endpoint
✅ **Email Integration** - Using Resend to send order notifications

## Setup Steps

### 1. Install Dependencies

```bash
cd /Users/sami.sabbagh/git/StitchWyse1
npm install
```

### 2. Get Resend API Key

1. Go to https://resend.com/signup
2. Sign up (free tier: 100 emails/day)
3. Go to **API Keys** → **Create API Key**
4. Copy your API key (starts with `re_...`)

### 3. Add Environment Variables

Add these to your Vercel project:

1. Go to https://vercel.com/samis-projects-04a510b3/stitch-wyse
2. **Settings** → **Environment Variables**
3. Add:

```bash
RESEND_API_KEY=re_your_api_key_here
ORDER_EMAIL=your-email@example.com
TURNSTILE_SECRET_KEY=0x0000000000000000000000000000000AA
```

4. Click **Save** → Vercel will redeploy

### 3.1 Optional Bot Protection (Recommended)

If `TURNSTILE_SECRET_KEY` is set, `/api/custom-order` requires a valid `captchaToken` in the request body.
The Framer snippets in `docs/` will include `captchaToken` automatically when a Turnstile widget is present on the page.

### 4. Add Form to Your Framer Site

1. Open Framer project
2. Press `Cmd + I` (Insert)
3. Search for **"CustomProductForm"**
4. Drag it onto your canvas
5. Done! ✅

### 5. Test the Form

1. Visit your published site: https://harmonious-run-886543.framer.app
2. Fill out the form
3. Click Submit
4. Check your email! 📧

## Customizing the Form

Select the form component in Framer and adjust these properties:

- **API Base URL** - Your backend (already set)
- **Product Types** - Add/remove product options
- **Stitch Types** - Add/remove stitch options
- **Color Palette** - Customize available colors
- **Show Design Upload For** - Which products allow design upload
- **Submit Button Text** - Customize button text
- **Submit Button Color** - Customize button color

## Form Fields

The form collects:
- Name
- Email
- Product Type (Beanies, Scrunchies, etc.)
- Colors (multi-select)
- Orientation (Horizontal/Vertical)
- Stitch Type
- Design Image (conditional, only for specified products)

## Email You'll Receive

```
New Custom Order Request

Customer Details:
- Name: John Doe
- Email: john@example.com

Product Configuration:
- Product Type: Beanies
- Colors: #FFB5C5, #B5E7FF, #D4C5F9
- Orientation: Horizontal
- Stitch Type: Waffle Stitch
- Custom Design: Attached

---
Received: 12/02/2026, 14:30:00
```

## Domain Email (Optional)

Once you have a custom domain, update the "from" email:

1. Add your domain to Resend
2. Verify DNS records
3. Update in `src/app/api/custom-order/route.ts`:

```typescript
from: "StitchWyse Orders <orders@stitchwyse.com>",
```

## Troubleshooting

**Form not submitting?**
- Check browser console for errors
- Verify Vercel environment variables are set
- Check Resend API key is valid
- If Turnstile is enabled, confirm your request includes a valid `captchaToken`

**Not receiving emails?**
- Check spam folder
- Verify ORDER_EMAIL is correct
- Check Resend dashboard for delivery logs

**Need help?**
- Resend docs: https://resend.com/docs
- Resend support: support@resend.com

## Next Steps

1. Install dependencies (`npm install`)
2. Get Resend API key
3. Add to Vercel
4. Test the form
5. Customize colors/options to match your products

Enjoy your new custom product configurator! 🎉
