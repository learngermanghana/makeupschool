import { NextResponse } from 'next/server';
import { PaymentError, initializeRegistrationPayment } from '@/lib/server/payments';

type PaymentInitPayload = {
  fullName?: string;
  phone?: string;
  email?: string;
  educationLevel?: string;
  courseId?: string;
  course?: string;
  startMonth?: string;
  classSlotId?: string;
  classStartAt?: string;
  classEndAt?: string;
  classSchedule?: string;
  classLocation?: string;
  classSeats?: string;
  noUpcomingClassSelected?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianRelationship?: string;
  message?: string;
};

function validate(payload: PaymentInitPayload) {
  return Boolean(payload.fullName && payload.phone && payload.email && payload.educationLevel && payload.course);
}

function buildRegistrationNotes(payload: PaymentInitPayload) {
  const lines = [payload.message || ''];
  if (payload.educationLevel) lines.push(`Education level: ${payload.educationLevel}`);
  if (payload.noUpcomingClassSelected) lines.push('No upcoming class was listed for the selected course. Admissions should assign the student to the next available class.');
  if (payload.classSlotId) lines.push(`Selected upcoming class slot: ${payload.classSlotId}`);
  if (payload.classSchedule) lines.push(`Class schedule: ${payload.classSchedule}`);
  if (payload.classStartAt) lines.push(`Class start: ${payload.classStartAt}`);
  if (payload.classEndAt) lines.push(`Class end: ${payload.classEndAt}`);
  if (payload.classLocation) lines.push(`Class location: ${payload.classLocation}`);
  if (payload.classSeats) lines.push(`Class seats: ${payload.classSeats}`);
  if (payload.guardianName) lines.push(`Guardian name: ${payload.guardianName}`);
  if (payload.guardianPhone) lines.push(`Guardian phone: ${payload.guardianPhone}`);
  if (payload.guardianEmail) lines.push(`Guardian email: ${payload.guardianEmail}`);
  if (payload.guardianRelationship) lines.push(`Guardian relationship: ${payload.guardianRelationship}`);
  return lines.filter(Boolean).join('\n');
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PaymentInitPayload;

    if (!validate(payload)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const callbackUrl = `${origin}/register`;
    const preferredStart = payload.startMonth || (payload.noUpcomingClassSelected ? 'No upcoming class selected / admissions will schedule' : 'Admissions will confirm schedule');

    const initialized = await initializeRegistrationPayment(
      {
        fullName: payload.fullName!,
        phone: payload.phone!,
        email: payload.email!,
        educationLevel: payload.educationLevel || '',
        courseId: payload.courseId || '',
        course: payload.course!,
        startMonth: preferredStart,
        classSlotId: payload.classSlotId || '',
        classStartAt: payload.classStartAt || '',
        classEndAt: payload.classEndAt || '',
        classSchedule: payload.classSchedule || '',
        classLocation: payload.classLocation || '',
        classSeats: payload.classSeats || '',
        noUpcomingClassSelected: Boolean(payload.noUpcomingClassSelected),
        guardianName: payload.guardianName || '',
        guardianPhone: payload.guardianPhone || '',
        guardianEmail: payload.guardianEmail || '',
        guardianRelationship: payload.guardianRelationship || '',
        message: buildRegistrationNotes(payload)
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
