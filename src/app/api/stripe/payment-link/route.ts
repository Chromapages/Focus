import { requireUserId } from '@/lib/auth';
import { createPaymentLink, createPrice, getOrCreateProduct } from '@/lib/stripe';

type Body = {
  customerName?: string;
  customerEmail?: string;
  amount: number; // dollars
  currency?: string; // default USD
  recurring?: {
    interval: 'month' | 'week' | 'year' | 'day';
  };
  category?: string; // Retainer/Project/Deposit/etc
  description?: string;
};

function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}

export async function POST(req: Request) {
  try {
    await requireUserId(req);

    const body = (await req.json()) as Body;
    if (!body?.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const currency = (body.currency || 'USD').toLowerCase();
    const isRecurring = Boolean(body.recurring?.interval);

    const productName = isRecurring ? 'Chroma — Monthly (Default)' : 'Chroma — One-time Payment';

    const product = await getOrCreateProduct({
      name: productName,
      idempotencyKey: `chroma_prod_${isRecurring ? 'recurring' : 'one_time'}_v1`,
      metadata: {
        rev_category: body.category || (isRecurring ? 'Retainer' : 'Project'),
      },
    });

    const price = await createPrice({
      productId: String(product.id),
      unitAmountCents: dollarsToCents(body.amount),
      currency,
      recurring: isRecurring ? { interval: body.recurring!.interval } : undefined,
      idempotencyKey: `chroma_price_${isRecurring ? 'recurring' : 'one_time'}_${dollarsToCents(body.amount)}_${currency}_v1`,
      metadata: {
        rev_category: body.category || (isRecurring ? 'Retainer' : 'Project'),
      },
    });

    // Stripe limitation: invoice_creation cannot be used with recurring prices.
    const paymentLink = await createPaymentLink({
      priceId: String(price.id),
      invoiceCreationEnabled: !isRecurring, // receipts/invoices via Stripe settings; invoice_creation only for one-time
      idempotencyKey: `chroma_plink_${isRecurring ? 'recurring' : 'one_time'}_${dollarsToCents(body.amount)}_${currency}_v1`,
      metadata: {
        rev_category: body.category || (isRecurring ? 'Retainer' : 'Project'),
      },
      subscriptionMetadata: isRecurring
        ? {
            rev_category: body.category || 'Retainer',
          }
        : undefined,
      paymentIntentMetadata: !isRecurring
        ? {
            rev_category: body.category || 'Project',
          }
        : undefined,
    });

    const clientLine = body.customerName ? `Client: ${body.customerName}` : body.customerEmail ? `Client: ${body.customerEmail}` : '';
    const cadence = isRecurring ? `per ${body.recurring!.interval}` : 'one-time';

    const message = [
      'Here is your payment link:',
      String(paymentLink.url),
      '',
      `Amount: $${body.amount} ${cadence}`,
      clientLine,
      body.description ? `For: ${body.description}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return Response.json({
      url: paymentLink.url,
      paymentLinkId: paymentLink.id,
      priceId: price.id,
      productId: product.id,
      recurring: isRecurring,
      note: !isRecurring
        ? 'Invoice/receipt file is enabled for one-time links. For subscriptions, Stripe will still send receipts based on email settings, but invoice_creation cannot be enabled on recurring payment links.'
        : 'Subscription link created. Stripe will send receipts based on your email receipt settings (invoice_creation is not available for recurring payment links).',
      draftMessage: message,
    });
  } catch (e: any) {
    const msg = e?.message || 'Failed';
    const status = msg === 'UNAUTHENTICATED' ? 401 : 500;
    return Response.json({ error: msg }, { status });
  }
}
