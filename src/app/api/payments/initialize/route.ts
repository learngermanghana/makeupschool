import { NextResponse } from 'next/server';
import { PaymentError, initializeRegistrationPayment } from '@/lib/server/payments';

type PaymentInitPayload = {
  fullName?: string;
  phone?: string;
  email?: string;
  courseId?: string;
  course?: string;
  startMonth?: string;
  classSlotId?: string;
  classStartAt?: string;
  classEndAt?: string;
  classSchedule?: string;
  classLocation?: string;
  classSeats?: string;
  message?: string;
};

function validate(payload: PaymentInitPayload) {
  return Boolean(payload.fullName && payload.phone && payload.email && payload.course && payload.startMonth);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PaymentInitPayload;

    if (!validate(payload)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/register`;

    const initialized = await initializeRegistrationPayment(
      {
        fullName: payload.fullName!,
        phone: payload.phone!,
        email: payload.email!,
        courseId: payload.courseId || '',
        course: payload.course!,
        startMonth: payload.startMonth!,
        classSlotId: payload.classSlotId || '',
        classStartAt: payload.classStartAt || '',
        classEndAt: payload.classEndAt || '',
        classSchedule: payload.classSchedule || '',
        classLocation: payload.classLocation || '',
        classSeats: payload.classSeats || '',
        message: payload.message || ''
      },
      callbackUrl
    );

    return NextResponse.json({ ok: true, ...initialized });
  } catch (error) {
    console.error('Payment initialization failed', error);

    if (error instanceof PaymentError) {
      return NextResponse.json({ error: 'Could not start payment.', reason: error.reason }, { status: error.status });
    }

    return NextResponse.json({ error: 'Could not start payment.', reason: 'unexpected_error' }, { status: 500 });
  }
}
