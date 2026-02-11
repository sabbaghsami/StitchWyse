export interface FramerCartItem {
  slug: string;
  name: string;
  image?: string;
  priceDisplay: string;
  stripePriceId: string;
  quantity: number;
}

export interface CheckoutClientOptions {
  apiBaseUrl: string;
  items: FramerCartItem[];
  customerEmail?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

interface CheckoutRequestPayload {
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

interface CheckoutSuccessResponse {
  url: string;
  id: string;
}

function assertValidCartItems(items: FramerCartItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty.");
  }

  for (const [index, item] of items.entries()) {
    if (!item?.stripePriceId || typeof item.stripePriceId !== "string") {
      throw new Error(`Invalid stripePriceId at cart index ${index}.`);
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new Error(`Invalid quantity at cart index ${index}. Quantity must be 1-99.`);
    }
  }
}

function aggregateItems(items: FramerCartItem[]): CheckoutRequestPayload["items"] {
  const quantityByPriceId = new Map<string, number>();

  for (const item of items) {
    const current = quantityByPriceId.get(item.stripePriceId) ?? 0;
    const next = Math.min(99, current + item.quantity);
    quantityByPriceId.set(item.stripePriceId, next);
  }

  return Array.from(quantityByPriceId.entries()).map(([priceId, quantity]) => ({
    priceId,
    quantity
  }));
}

function sanitizeMetadata(
  metadata?: Record<string, string | number | boolean | null | undefined>
): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue;
    }
    sanitized[key] = String(value);
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export async function createCheckoutSession(
  options: CheckoutClientOptions
): Promise<CheckoutSuccessResponse> {
  assertValidCartItems(options.items);

  const payload: CheckoutRequestPayload = {
    items: aggregateItems(options.items),
    customerEmail: options.customerEmail?.trim() || undefined,
    metadata: sanitizeMetadata(options.metadata)
  };

  const endpoint = `${options.apiBaseUrl.replace(/\/+$/, "")}/api/checkout`;
  const idempotencyKey = `framer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Checkout failed. Please try again.";
    throw new Error(error);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { url?: unknown }).url !== "string" ||
    typeof (body as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Checkout failed: backend returned an invalid response.");
  }

  return body as CheckoutSuccessResponse;
}

export async function redirectToStripeCheckout(options: CheckoutClientOptions): Promise<void> {
  const session = await createCheckoutSession(options);
  window.location.assign(session.url);
}
