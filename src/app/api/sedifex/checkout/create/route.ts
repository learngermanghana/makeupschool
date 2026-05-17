import { NextResponse } from 'next/server';
import { createCheckout } from '@/lib/checkout/sedifex-checkout';

type CreatePayload = {
  clientOrderId: string;
  currency: string;
  amount: number;
  items: { id: string; name: string; unitPrice: number; qty: number }[];
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreatePayload;

    if (!payload?.clientOrderId || !payload?.currency || !Number.isFinite(payload?.amount) || !Array.isArray(payload?.items) || !payload?.customer?.email || !payload?.returnUrl) {
      return NextResponse.json({ error: 'Invalid checkout create payload.' }, { status: 400 });
    }

    const created = await createCheckout(payload);
    return NextResponse.json(created);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Checkout creation failed.' }, { status: 502 });
  }
}
