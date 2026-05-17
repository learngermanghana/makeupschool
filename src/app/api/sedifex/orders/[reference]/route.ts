import { NextResponse } from 'next/server';
import { getOrderStatus } from '@/lib/checkout/sedifex-checkout';

export async function GET(_: Request, context: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await context.params;
    if (!reference) return NextResponse.json({ ok: false, error: 'Missing reference.' }, { status: 400 });

    const order = await getOrderStatus(reference);
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Order lookup failed.' }, { status: 502 });
  }
}
