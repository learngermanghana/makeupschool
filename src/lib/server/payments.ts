export type RegistrationMetadata = {
  fullName: string;
  phone: string;
  email: string;
  courseId: string;
  course: string;
  startMonth: string;
  message: string;
};

function hasRequiredMetadata(metadata: RegistrationMetadata | undefined): metadata is RegistrationMetadata {
  if (!metadata) {
    return false;
  }

  return Boolean(metadata.fullName && metadata.phone && metadata.email && metadata.course && metadata.startMonth);
}

type SedifexCourseItem = {
  id?: unknown;
  sourceProductId?: unknown;
  sourceId?: unknown;
  name?: unknown;
  productName?: unknown;
  title?: unknown;
  itemType?: unknown;
  listingType?: unknown;
  serviceKind?: unknown;
  enrollmentMode?: unknown;
  price?: unknown;
  sellingPrice?: unknown;
  salePrice?: unknown;
  amount?: unknown;
  fee?: unknown;
  registrationFee?: unknown;
  currency?: unknown;
};

type SedifexCatalogResponse = {
  products?: SedifexCourseItem[];
  publicServices?: SedifexCourseItem[];
  services?: SedifexCourseItem[];
};

type SedifexStudentRegistrationResponse = {
  ok?: boolean;
  submissionId?: string;
  reference?: string;
  paymentMode?: string;
  paymentStatus?: string;
  payment?: {
    provider?: string;
    ok?: boolean;
    reference?: string;
    authorizationUrl?: string | null;
    authorization_url?: string | null;
    checkoutUrl?: string | null;
    accessCode?: string | null;
    message?: string | null;
  } | null;
  feePolicy?: unknown;
  reason?: string;
  message?: string;
  error?: string;
};

type VerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    reference?: string;
    status: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    customer?: {
      email?: string;
    };
    metadata?: RegistrationMetadata;
  };
};

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY_ENV = 'PAYSTACK_SECRET_KEY';
const PAYSTACK_PUBLIC_KEY_ENV = 'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY';
const REGISTRATION_AMOUNT_KOBO_ENV = 'REGISTRATION_FEE_KOBO';
const PAYSTACK_CURRENCY_ENV = 'PAYSTACK_CURRENCY';
const DEFAULT_REGISTRATION_AMOUNT_KOBO = 500000;
const DEFAULT_PAYSTACK_CURRENCY = 'GHS';
const DEFAULT_SEDIFEX_API_BASE_URL = 'https://us-central1-sedifex-web.cloudfunctions.net';
const DEFAULT_SEDIFEX_SITE_BASE_URL = 'https://www.sedifex.com';
const CONTRACT_VERSION = '2026-04-13';

export class PaymentError extends Error {
  readonly status: number;
  readonly reason: string;

  constructor(message: string, status: number, reason: string) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
    this.reason = reason;
  }
}

function text(value: unknown, max = 1000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function getEnv(...names: string[]) {
  for (const name of names) {
    const value = text(process.env[name]);
    if (value) return value;
  }

  return '';
}

function getPositiveNumber(...names: string[]) {
  for (const name of names) {
    const raw = text(process.env[name], 80);
    if (!raw) continue;

    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function getApiKey() {
  return getEnv(
    'SEDIFEX_INTEGRATION_API_KEY',
    'SEDIFEX_INTEGRATION_KEY',
    'SEDFIEX_INTEGRATION_KEY',
    'SEDFIEX_API_KEY',
    'INTEGRATION_KEY'
  );
}

function getSedifexRegistrationConfig() {
  const storeId = getEnv('SEDIFEX_STORE_ID', 'SEDFIEX_STORE_ID', 'INTEGRATION_STORE_ID');
  const apiBaseUrl = (getEnv('SEDIFEX_API_BASE_URL', 'SEDIFEX_INTEGRATION_API_BASE_URL') || DEFAULT_SEDIFEX_API_BASE_URL).replace(/\/$/, '');
  const siteBaseUrl = (getEnv('SEDIFEX_SITE_BASE_URL') || DEFAULT_SEDIFEX_SITE_BASE_URL).replace(/\/$/, '');
  const endpoint = getEnv('SEDIFEX_REGISTRATION_INTAKE_URL') || `${siteBaseUrl}/api/student-registration-intake`;
  const fallbackCurrency = getEnv('SEDIFEX_REGISTRATION_CURRENCY', PAYSTACK_CURRENCY_ENV) || DEFAULT_PAYSTACK_CURRENCY;

  if (!storeId) {
    throw new PaymentError('Missing SEDIFEX_STORE_ID for student registration checkout.', 503, 'sedifex_store_missing');
  }

  return { storeId, apiBaseUrl, endpoint, fallbackCurrency };
}

function getPaymentConfig() {
  const secretKey = process.env[PAYSTACK_SECRET_KEY_ENV];
  const publicKey = process.env[PAYSTACK_PUBLIC_KEY_ENV];
  const amountRaw = process.env[REGISTRATION_AMOUNT_KOBO_ENV];
  const currencyRaw = process.env[PAYSTACK_CURRENCY_ENV];
  const amountKobo = Number(amountRaw || DEFAULT_REGISTRATION_AMOUNT_KOBO);
  const currency = (currencyRaw || DEFAULT_PAYSTACK_CURRENCY).trim().toUpperCase();

  if (!secretKey || !publicKey) {
    throw new PaymentError(
      `Missing payment configuration (${PAYSTACK_SECRET_KEY_ENV} or ${PAYSTACK_PUBLIC_KEY_ENV}).`,
      503,
      'payment_config_missing'
    );
  }

  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    throw new PaymentError(
      `${REGISTRATION_AMOUNT_KOBO_ENV} must be a positive integer.`,
      503,
      'payment_config_invalid'
    );
  }

  if (!currency) {
    throw new PaymentError(
      `${PAYSTACK_CURRENCY_ENV} must be a valid ISO currency code.`,
      503,
      'payment_config_invalid'
    );
  }

  return { secretKey, amountKobo, currency };
}

function normalizeKey(value: unknown) {
  return text(value, 220).toLowerCase();
}

function getCourseName(item: SedifexCourseItem) {
  return text(item.name ?? item.productName ?? item.title, 220);
}

function getCourseKeys(item: SedifexCourseItem) {
  return [item.id, item.sourceProductId, item.sourceId, getCourseName(item)]
    .map((value) => normalizeKey(value))
    .filter(Boolean);
}

function isCourseLike(item: SedifexCourseItem) {
  const itemType = normalizeKey(item.itemType);
  const listingType = normalizeKey(item.listingType);
  const serviceKind = normalizeKey(item.serviceKind);
  const enrollmentMode = normalizeKey(item.enrollmentMode);

  return (
    itemType === 'service' ||
    itemType === 'course' ||
    listingType === 'course' ||
    serviceKind.includes('course') ||
    enrollmentMode.includes('open') ||
    enrollmentMode.includes('scheduled')
  );
}

function readCoursePrice(item: SedifexCourseItem) {
  const amount = Number(item.registrationFee ?? item.price ?? item.sellingPrice ?? item.salePrice ?? item.amount ?? item.fee);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function readCourseCurrency(item: SedifexCourseItem, fallbackCurrency: string) {
  return text(item.currency, 20).toUpperCase() || fallbackCurrency;
}

async function getSelectedCoursePrice(metadata: RegistrationMetadata, config: ReturnType<typeof getSedifexRegistrationConfig>) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new PaymentError('Missing Sedifex integration API key for course price lookup.', 503, 'sedifex_api_key_missing');
  }

  const url = `${config.apiBaseUrl}/v1IntegrationProducts?storeId=${encodeURIComponent(config.storeId)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'x-api-key': apiKey,
      Authorization: `Bearer ${apiKey}`,
      'X-Sedifex-Contract-Version': CONTRACT_VERSION
    },
    cache: 'no-store'
  });

  const catalog = (await response.json().catch(() => null)) as SedifexCatalogResponse | null;

  if (!response.ok) {
    throw new PaymentError(`Could not load Sedifex course catalog (${response.status}).`, 502, 'course_catalog_failed');
  }

  const items = [
    ...(Array.isArray(catalog?.products) ? catalog.products : []),
    ...(Array.isArray(catalog?.publicServices) ? catalog.publicServices : []),
    ...(Array.isArray(catalog?.services) ? catalog.services : [])
  ];

  const wantedId = normalizeKey(metadata.courseId);
  const wantedName = normalizeKey(metadata.course);
  const course = items.find((item) => {
    if (!isCourseLike(item)) return false;
    const keys = getCourseKeys(item);
    return (wantedId && keys.includes(wantedId)) || (wantedName && keys.includes(wantedName));
  });

  if (!course) {
    throw new PaymentError('Selected course was not found in Sedifex integration products.', 400, 'course_not_found');
  }

  const amount = readCoursePrice(course);
  if (!amount) {
    throw new PaymentError('Selected course has no valid price in Sedifex.', 400, 'course_price_missing');
  }

  const resolvedName = getCourseName(course) || metadata.course;
  const resolvedId = text(course.id ?? metadata.courseId, 220);

  return {
    amount,
    currency: readCourseCurrency(course, config.fallbackCurrency),
    courseName: resolvedName,
    courseId: resolvedId
  };
}

async function readSedifexJson(response: Response) {
  return response.json().catch(async () => {
    const fallback = await response.text().catch(() => '');
    return fallback ? { message: fallback } : null;
  }) as Promise<SedifexStudentRegistrationResponse | null>;
}

export async function initializeRegistrationPayment(metadata: RegistrationMetadata, callbackUrl: string) {
  const config = getSedifexRegistrationConfig();
  const coursePayment = await getSelectedCoursePrice(metadata, config);

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      storeId: config.storeId,
      pageId: 'makeupschool-student-registration',
      source: 'makeupschool_registration_page',
      customer: {
        name: metadata.fullName,
        email: metadata.email,
        phone: metadata.phone
      },
      data: {
        course: coursePayment.courseName,
        serviceId: coursePayment.courseId || metadata.courseId || null,
        preferredClassTime: metadata.startMonth,
        branch: 'Tema',
        notes: metadata.message || null
      },
      payment: {
        mode: 'online',
        amount: coursePayment.amount,
        currency: coursePayment.currency,
        callbackUrl
      }
    })
  });

  const result = await readSedifexJson(response);

  if (!response.ok || !result?.ok) {
    throw new PaymentError(
      `Sedifex student registration checkout failed (${response.status}): ${result?.message || result?.error || 'Unknown error'}`,
      response.ok ? 502 : response.status,
      result?.reason || result?.error || 'sedifex_checkout_failed'
    );
  }

  const authorizationUrl =
    result.payment?.authorizationUrl ||
    result.payment?.authorization_url ||
    result.payment?.checkoutUrl ||
    null;

  if (!authorizationUrl) {
    throw new PaymentError('Sedifex did not return a Paystack checkout URL.', 502, 'checkout_url_missing');
  }

  return {
    authorizationUrl,
    reference: result.reference || result.payment?.reference || '',
    submissionId: result.submissionId || '',
    paymentStatus: result.paymentStatus || 'pending',
    amount: coursePayment.amount,
    currency: coursePayment.currency,
    courseId: coursePayment.courseId,
    courseName: coursePayment.courseName
  };
}

export async function verifyPayment(reference: string) {
  const config = getPaymentConfig();

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${config.secretKey}`
    }
  });

  const result = (await response.json().catch(() => null)) as VerifyResponse | null;

  if (!response.ok || !result?.status || !result.data) {
    throw new PaymentError(
      `Payment verification failed (${response.status}): ${result?.message || 'Unknown error'}`,
      502,
      'payment_verify_failed'
    );
  }

  if (result.data.status !== 'success') {
    throw new PaymentError('Payment was not successful.', 402, 'payment_not_successful');
  }

  if (!hasRequiredMetadata(result.data.metadata)) {
    throw new PaymentError('Payment metadata is missing.', 400, 'payment_metadata_missing');
  }

  if (result.data.amount !== config.amountKobo) {
    throw new PaymentError('Payment amount mismatch.', 400, 'payment_amount_mismatch');
  }

  if ((result.data.currency || '').toUpperCase() !== config.currency) {
    throw new PaymentError('Payment currency mismatch.', 400, 'payment_currency_mismatch');
  }

  if ((result.data.customer?.email || '').toLowerCase() !== result.data.metadata.email.toLowerCase()) {
    throw new PaymentError('Payment email mismatch.', 400, 'payment_email_mismatch');
  }

  const verifiedReference = result.data.reference || reference;

  return {
    reference: verifiedReference,
    metadata: result.data.metadata,
    paidAtIso: result.data.paid_at || new Date().toISOString()
  };
}
