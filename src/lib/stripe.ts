const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function getStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  return key;
}

async function stripeRequest(path: string, opts?: { method?: string; form?: Record<string, any>; idempotencyKey?: string }) {
  const key = getStripeKey();
  const method = opts?.method ?? 'GET';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };

  let body: string | undefined;
  if (opts?.form) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.form)) {
      if (v === undefined || v === null) continue;
      params.set(k, String(v));
    }
    body = params.toString();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const res = await fetch(`${STRIPE_API_BASE}${path}`, { method, headers, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.error?.message ?? `Stripe request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as any;
}

export async function getOrCreateProduct(args: { name: string; metadata?: Record<string, string>; idempotencyKey: string }) {
  // Try to find an existing product by name
  const list = await stripeRequest(`/products?limit=100&active=true`);
  const hit = Array.isArray(list?.data) ? list.data.find((p: any) => p?.name === args.name) : null;
  if (hit) return hit;

  const form: Record<string, any> = { name: args.name };
  if (args.metadata) {
    for (const [k, v] of Object.entries(args.metadata)) form[`metadata[${k}]`] = v;
  }
  return stripeRequest('/products', { method: 'POST', form, idempotencyKey: args.idempotencyKey });
}

export async function createPrice(args: {
  productId: string;
  unitAmountCents: number;
  currency: string;
  recurring?: { interval: 'month' | 'week' | 'year' | 'day' };
  metadata?: Record<string, string>;
  idempotencyKey: string;
}) {
  const form: Record<string, any> = {
    unit_amount: args.unitAmountCents,
    currency: args.currency,
    product: args.productId,
  };
  if (args.recurring) form['recurring[interval]'] = args.recurring.interval;
  if (args.metadata) {
    for (const [k, v] of Object.entries(args.metadata)) form[`metadata[${k}]`] = v;
  }
  return stripeRequest('/prices', { method: 'POST', form, idempotencyKey: args.idempotencyKey });
}

export async function createPaymentLink(args: {
  priceId: string;
  quantity?: number;
  invoiceCreationEnabled?: boolean;
  metadata?: Record<string, string>;
  subscriptionMetadata?: Record<string, string>;
  paymentIntentMetadata?: Record<string, string>;
  idempotencyKey: string;
}) {
  const form: Record<string, any> = {
    'line_items[0][price]': args.priceId,
    'line_items[0][quantity]': args.quantity ?? 1,
    'after_completion[type]': 'hosted_confirmation',
  };

  if (args.invoiceCreationEnabled) form['invoice_creation[enabled]'] = 'true';

  if (args.metadata) {
    for (const [k, v] of Object.entries(args.metadata)) form[`metadata[${k}]`] = v;
  }

  // For one-time payments
  if (args.paymentIntentMetadata) {
    for (const [k, v] of Object.entries(args.paymentIntentMetadata)) {
      form[`payment_intent_data[metadata][${k}]`] = v;
    }
  }

  // For subscriptions
  if (args.subscriptionMetadata) {
    for (const [k, v] of Object.entries(args.subscriptionMetadata)) {
      form[`subscription_data[metadata][${k}]`] = v;
    }
  }

  return stripeRequest('/payment_links', { method: 'POST', form, idempotencyKey: args.idempotencyKey });
}
