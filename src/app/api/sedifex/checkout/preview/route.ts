import { NextResponse } from 'next/server';
import { previewCheckout, type CheckoutPreviewRequest } from '@/lib/checkout/sedifex-checkout';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CheckoutPreviewRequest;

    if (!payload?.merchant_id || !payload?.currency || !payload?.fulfillment_type || !Array.isArray(payload?.items) || payload.items.length === 0) {
      return NextResponse.json({ error: 'Invalid checkout preview payload.' }, { status: 400 });
    }

    const preview = await previewCheckout(payload);
    return NextResponse.json({ ok: true, ...preview });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Preview failed.' }, { status: 502 });
  }
}
