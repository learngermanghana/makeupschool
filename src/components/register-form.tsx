'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Course } from '@/data/courses';
import type { UpcomingClass } from '@/data/upcoming-classes';

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  educationLevel: string;
  courseId: string;
  course: string;
  startMonth: string;
  classSlotId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
  message: string;
};

const initialState: FormState = {
  fullName: '',
  phone: '',
  email: '',
  educationLevel: '',
  courseId: '',
  course: '',
  startMonth: '',
  classSlotId: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianRelationship: '',
  message: ''
};

const UNSCHEDULED_CLASS_VALUE = '__no_upcoming_class_yet__';
const UNSCHEDULED_START_LABEL = 'No upcoming class selected / admissions will schedule';

const EDUCATION_LEVEL_OPTIONS = [
  'No formal education',
  'JHS / Junior High School',
  'SHS / Senior High School',
  'Vocational / Technical',
  'Diploma',
  'Tertiary / University',
  'Graduate',
  'Other'
];

type Props = {
  courses: Course[];
  upcomingClasses: UpcomingClass[];
};

function normalizeCourseName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function formatMoney(amount?: number, currency = 'GHS') {
  if (!Number.isFinite(amount)) return 'Price from Sedifex';
  return `${currency} ${Number(amount).toFixed(2)}`;
}

export function RegisterForm({ courses, upcomingClasses }: Props) {
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const helperText = useMemo(
    () => 'Submitting this form creates your Sedifex student registration and takes you to secure payment. If no upcoming class date is listed yet, you can still pay and admissions will assign your class schedule.',
    []
  );

  const courseOptions = useMemo(() => {
    const byKey = new Map<string, Course>();
    for (const course of courses) {
      const key = course.serviceId || course.slug || course.name;
      if (key) byKey.set(key, course);
    }
    for (const item of upcomingClasses) {
      const key = item.serviceId || item.name;
      if (!byKey.has(key)) {
        byKey.set(key, {
          slug: item.serviceId || item.id,
          serviceId: item.serviceId,
          name: item.name,
          duration: item.duration,
          summary: 'Upcoming class from Sedifex availability',
          category: item.category === 'Full Programs' ? 'Full Program' : 'Short Course',
          image: item.image,
          imageAlt: item.imageAlt,
          price: item.price,
          currency: item.currency
        });
      }
    }
    return Array.from(byKey.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [courses, upcomingClasses]);

  const selectedCourse = useMemo(() => {
    if (!form.courseId && !form.course) return null;
    return courseOptions.find((course) => (course.serviceId || course.slug) === form.courseId || course.name === form.course) || null;
  }, [courseOptions, form.course, form.courseId]);

  const upcomingClassesForCourse = useMemo(() => {
    if (!selectedCourse && !form.course) return [];
    const selectedServiceId = selectedCourse?.serviceId || form.courseId;
    const selectedName = normalizeCourseName(selectedCourse?.name || form.course);
    return upcomingClasses.filter((item) => {
      const itemServiceId = item.serviceId || '';
      const itemName = normalizeCourseName(item.name);
      return (selectedServiceId && itemServiceId === selectedServiceId) || itemName === selectedName || itemName.includes(selectedName) || selectedName.includes(itemName);
    });
  }, [form.course, form.courseId, selectedCourse, upcomingClasses]);

  const selectedClass = useMemo(() => {
    if (!form.classSlotId || form.classSlotId === UNSCHEDULED_CLASS_VALUE) return null;
    return upcomingClassesForCourse.find((item) => item.slotId === form.classSlotId || item.id === form.classSlotId) || null;
  }, [form.classSlotId, upcomingClassesForCourse]);

  const noUpcomingClassForSelectedCourse = Boolean(form.course && upcomingClassesForCourse.length === 0);

  useEffect(() => {
    const status = searchParams.get('status');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const normalizedStatus = status?.toLowerCase();
    if (!reference || success) return;
    if (normalizedStatus && normalizedStatus !== 'success') {
      setError('Payment was not completed. Please try again or contact admissions if you were charged.');
      return;
    }
    setForm(initialState);
    setError('');
    setSuccess(`Payment received. Your registration is in Sedifex with reference ${reference}. Admissions will contact you with the next steps.`);
  }, [searchParams, success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.fullName || !form.phone || !form.email || !form.educationLevel || !form.course) {
      setError('Please complete your name, phone, email, education level, and selected course before submitting.');
      setSuccess('');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const preferredStart = selectedClass?.startDate || form.startMonth || UNSCHEDULED_START_LABEL;
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startMonth: preferredStart,
          classSlotId: selectedClass?.slotId || selectedClass?.id || (noUpcomingClassForSelectedCourse ? '' : form.classSlotId),
          classStartAt: selectedClass?.startAt,
          classEndAt: selectedClass?.endAt,
          classSchedule: selectedClass?.schedule || (noUpcomingClassForSelectedCourse ? 'No upcoming class listed yet' : undefined),
          classLocation: selectedClass?.location,
          classSeats: selectedClass?.slots,
          noUpcomingClassSelected: noUpcomingClassForSelectedCourse
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { reason?: string } | null;
        if (payload?.reason === 'course_price_missing') throw new Error('The selected course has no price in Sedifex yet. Please contact admissions.');
        if (payload?.reason === 'course_not_found') throw new Error('The selected course could not be found in Sedifex. Please refresh and try again.');
        if (payload?.reason === 'sedifex_store_missing') throw new Error('Sedifex store is not configured on the server yet. Please contact support.');
        const reason = payload?.reason ? ` (${payload.reason})` : '';
        throw new Error(`Payment initialization failed with status ${response.status}${reason}`);
      }
      const payload = (await response.json()) as { authorizationUrl?: string; checkoutUrl?: string };
      const checkoutUrl = payload.authorizationUrl || payload.checkoutUrl;
      if (!checkoutUrl) throw new Error('Payment authorization link was not returned by the server.');
      window.location.assign(checkoutUrl);
    } catch (submissionError) {
      console.error(submissionError);
      setError(submissionError instanceof Error ? submissionError.message : 'Could not start payment right now. Please try again in a moment or contact admissions.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-soft sm:p-10">
      <div className="mb-8 rounded-3xl bg-nude/70 p-5 text-sm leading-7 text-charcoal/75">{helperText}</div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name" required><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="input" /></Field>
        <Field label="Phone number" required><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="input" /></Field>
        <Field label="Email address" required><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="input" /></Field>
        <Field label="Education level" required>
          <select value={form.educationLevel} onChange={(event) => setForm({ ...form, educationLevel: event.target.value })} className="input">
            <option value="">Select education level</option>
            {EDUCATION_LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </Field>
        <Field label="Course interested in" required>
          <select value={form.courseId} onChange={(event) => { const selected = courseOptions.find((course) => (course.serviceId || course.slug) === event.target.value); setForm({ ...form, courseId: event.target.value, course: selected?.name || '', startMonth: '', classSlotId: '' }); }} className="input">
            <option value="">Select a course</option>
            {courseOptions.map((course) => { const value = course.serviceId || course.slug; return <option key={value} value={value}>{course.name} — {formatMoney(course.price, course.currency)}</option>; })}
          </select>
          {selectedCourse ? <p className="text-xs leading-5 text-charcoal/60">Selected course fee: <span className="font-semibold text-charcoal">{formatMoney(selectedCourse.price, selectedCourse.currency)}</span></p> : null}
        </Field>
        <Field label="Preferred upcoming class">
          <select value={noUpcomingClassForSelectedCourse ? UNSCHEDULED_CLASS_VALUE : form.classSlotId} onChange={(event) => { const selected = upcomingClassesForCourse.find((item) => item.slotId === event.target.value || item.id === event.target.value); setForm({ ...form, classSlotId: event.target.value, startMonth: selected?.startDate || '' }); }} className="input" disabled={!form.course || upcomingClassesForCourse.length === 0}>
            <option value="">{!form.course ? 'Select a course first' : upcomingClassesForCourse.length === 0 ? 'No upcoming classes listed yet' : 'Select upcoming class'}</option>
            {noUpcomingClassForSelectedCourse ? <option value={UNSCHEDULED_CLASS_VALUE}>Pay now — admissions will schedule your class</option> : null}
            {upcomingClassesForCourse.map((item) => <option key={item.slotId || item.id} value={item.slotId || item.id}>{item.startDate} — {item.schedule} — {item.slots}</option>)}
          </select>
          {selectedClass ? <p className="text-xs leading-5 text-charcoal/60">This registration will be linked to Sedifex upcoming class slot <span className="font-semibold text-charcoal">{selectedClass.slotId || selectedClass.id}</span>.</p> : null}
          {noUpcomingClassForSelectedCourse ? <p className="text-xs leading-5 text-charcoal/60">No upcoming class is listed yet for this course. You can still pay now; admissions will contact you with the class date and schedule.</p> : null}
        </Field>
      </div>

      <div className="mt-8 rounded-3xl border border-black/5 bg-cream/60 p-5">
        <h3 className="font-display text-2xl text-charcoal">Parent / guardian details</h3>
        <p className="mt-2 text-sm leading-6 text-charcoal/65">Add this if a parent, sponsor, or guardian should be contacted about the student registration.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Guardian name"><input value={form.guardianName} onChange={(event) => setForm({ ...form, guardianName: event.target.value })} className="input" /></Field>
          <Field label="Guardian phone"><input value={form.guardianPhone} onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })} className="input" /></Field>
          <Field label="Guardian email"><input type="email" value={form.guardianEmail} onChange={(event) => setForm({ ...form, guardianEmail: event.target.value })} className="input" /></Field>
          <Field label="Relationship"><input value={form.guardianRelationship} onChange={(event) => setForm({ ...form, guardianRelationship: event.target.value })} placeholder="e.g. Mother, Father, Sponsor" className="input" /></Field>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <Field label="Message"><input value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us about your goals or preferred schedule." className="input" /></Field>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-700">{success}</p> : null}
      <button type="submit" disabled={isSubmitting} className="mt-8 inline-flex rounded-full bg-charcoal px-6 py-3 text-sm font-medium text-white transition hover:bg-charcoal/90 disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? 'Redirecting to payment...' : selectedCourse ? `Pay ${formatMoney(selectedCourse.price, selectedCourse.currency)} & submit registration` : 'Pay & submit registration'}
      </button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="space-y-2 text-sm font-medium text-charcoal"><span>{label} {required ? <span className="text-gold">*</span> : null}</span>{children}</label>;
}
