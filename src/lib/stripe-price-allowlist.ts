const PRICE_ID_PATTERN = /^price_[a-zA-Z0-9]+$/;

function parseCsv(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export interface StripePriceAllowlist {
  enforce: boolean;
  allowedPriceIds: Set<string>;
}

export function getStripePriceAllowlist(): StripePriceAllowlist {
  const allowlistRaw = process.env.ALLOWED_STRIPE_PRICE_IDS?.trim() ?? "";
  const enforceRaw = process.env.ENFORCE_STRIPE_PRICE_ALLOWLIST?.trim() ?? "";

  const allowed = new Set(parseCsv(allowlistRaw));

  const enforce =
    enforceRaw.length > 0
      ? enforceRaw.toLowerCase() === "true"
      : process.env.NODE_ENV === "production";

  return {
    enforce,
    allowedPriceIds: allowed
  };
}

export function validateStripePriceId(priceId: string): string | null {
  const trimmed = priceId.trim();

  if (!trimmed) {
    return "priceId must be a non-empty string.";
  }

  if (!PRICE_ID_PATTERN.test(trimmed)) {
    return "priceId must look like a Stripe Price ID (price_...).";
  }

  return null;
}

