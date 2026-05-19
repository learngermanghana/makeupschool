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
  courseId: string;
  course: string;
  startMonth: string;
  message: string;
};

const initialState: FormState = {
  fullName: '',
  phone: '',
  email: '',
  courseId: '',
  course: '',
  startMonth: '',
  message: ''
};

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
    () => 'Submitting this form creates your Sedifex student registration and takes you to secure payment. The amount is pulled from the selected course in Sedifex.',
    []
  );

  const courseOptions = useMemo(() => {
    const byName = new Map<string, Course>();
    for (const course of courses) {
      if (course.name) byName.set(course.name, course);
    }
    for (const item of upcomingClasses) {
      if (!byName.has(item.name)) {
        byName.set(item.name, {
          slug: item.id,
          name: item.name,
          duration: item.duration,
          summary: 'Upcoming class from Sedifex availability',
          category: item.category === 'Full Programs' ? 'Full Program' : 'Short Course',
          image: item.image,
          imageAlt: item.imageAlt
        });
      }
    }
    return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [courses, upcomingClasses]);

  const selectedCourse = useMemo(() => {
    if (!form.courseId && !form.course) return null;
    return courseOptions.find((course) => (course.serviceId || course.slug) === form.courseId || course.name === form.course) || null;
  }, [courseOptions, form.course, form.courseId]);

  const classDatesByCourse = useMemo(() => {
    return upcomingClasses.reduce<Record<string, string[]>>((accumulator, item) => {
      const key = normalizeCourseName(item.name);
      accumulator[key] = accumulator[key] ? [...accumulator[key], item.startDate] : [item.startDate];
      return accumulator;
    }, {});
  }, [upcomingClasses]);

  const selectedCourseDates = useMemo(() => {
    if (!form.course) return [];

    const exact = classDatesByCourse[normalizeCourseName(form.course)] ?? [];
    if (exact.length) return exact;

    if (!selectedCourse) return [];

    const selectedName = normalizeCourseName(selectedCourse.name);
    const partialMatches = Object.entries(classDatesByCourse)
      .filter(([name]) => name.includes(selectedName) || selectedName.includes(name))
      .flatMap(([, dates]) => dates);

    return Array.from(new Set(partialMatches));
  }, [classDatesByCourse, form.course, selectedCourse]);

  useEffect(() => {
    const status = searchParams.get('status');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const normalizedStatus = status?.toLowerCase();

    if (!reference || success) {
      return;
    }

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

    if (!form.fullName || !form.phone || !form.email || !form.course || !form.startMonth) {
      setError('Please complete all required fields before submitting.');
      setSuccess('');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { reason?: string } | null;
        if (payload?.reason === 'course_price_missing') {
          throw new Error('The selected course has no price in Sedifex yet. Please contact admissions.');
        }
        if (payload?.reason === 'course_not_found') {
          throw new Error('The selected course could not be found in Sedifex. Please refresh and try again.');
        }
        if (payload?.reason === 'sedifex_store_missing') {
          throw new Error('Sedifex store is not configured on the server yet. Please contact support.');
        }

        const reason = payload?.reason ? ` (${payload.reason})` : '';
        throw new Error(`Payment initialization failed with status ${response.status}${reason}`);
      }

      const payload = (await response.json()) as { authorizationUrl?: string; checkoutUrl?: string };
      const checkoutUrl = payload.authorizationUrl || payload.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Payment authorization link was not returned by the server.');
      }

      window.location.assign(checkoutUrl);
    } catch (submissionError) {
      console.error(submissionError);
      setError('Could not start payment right now. Please try again in a moment or contact admissions.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-soft sm:p-10">
      <div className="mb-8 rounded-3xl bg-nude/70 p-5 text-sm leading-7 text-charcoal/75">{helperText}</div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name" required>
          <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="input" />
        </Field>
        <Field label="Phone number" required>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="input" />
        </Field>
        <Field label="Email address" required>
          <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="input" />
        </Field>
        <Field label="Course interested in" required>
          <select
            value={form.courseId}
            onChange={(event) => {
              const selected = courseOptions.find((course) => (course.serviceId || course.slug) === event.target.value);
              setForm({
                ...form,
                courseId: event.target.value,
                course: selected?.name || '',
                startMonth: ''
              });
            }}
            className="input"
          >
            <option value="">Select a course</option>
            {courseOptions.map((course) => {
              const value = course.serviceId || course.slug;
              return (
                <option key={value} value={value}>
                  {course.name} — {formatMoney(course.price, course.currency)}
                </option>
              );
            })}
          </select>
          {selectedCourse ? (
            <p className="text-xs leading-5 text-charcoal/60">
              Selected course fee: <span className="font-semibold text-charcoal">{formatMoney(selectedCourse.price, selectedCourse.currency)}</span>
            </p>
          ) : null}
        </Field>
        <Field label="Preferred start date" required>
          <select
            value={form.startMonth}
            onChange={(event) => setForm({ ...form, startMonth: event.target.value })}
            className="input"
            disabled={!form.course || selectedCourseDates.length === 0}
          >
            <option value="">
              {!form.course
                ? 'Select a course first'
                : selectedCourseDates.length === 0
                  ? 'No upcoming class dates listed'
                  : 'Select a start date'}
            </option>
            {selectedCourseDates.map((date) => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </Field>
        <Field label="Message">
          <input value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us about your goals or preferred schedule." className="input" />
        </Field>
      </div>
      {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-700">{success}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 inline-flex rounded-full bg-charcoal px-6 py-3 text-sm font-medium text-white transition hover:bg-charcoal/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Redirecting to payment...' : selectedCourse ? `Pay ${formatMoney(selectedCourse.price, selectedCourse.currency)} & submit registration` : 'Pay & submit registration'}
      </button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-charcoal">
      <span>
        {label} {required ? <span className="text-gold">*</span> : null}
      </span>
      {children}
    </label>
  );
}
