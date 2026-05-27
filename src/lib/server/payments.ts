export type RegistrationMetadata = {
  fullName: string;
  phone: string;
  email: string;
  courseId: string;
  course: string;
  startMonth: string;
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
  message: string;
};

type SedifexCourseItem = {
  id?: unknown;
  sourceProductId?: unknown;
  sourceId?: unknown;
  name?: unknown;
  productName?: unknown;
  title?: unknown;
  itemType?: unknown;
  type?: unknown;
  listingType?: unknown;
  serviceKind?: unknown;
  enrollmentMode?: unknown;
  category?: unknown;
  price?: unknown;
  priceMinor?: unknown;
  sellingPrice?: unknown;
  salePrice?: unknown;
  amount?: unknown;
  fee?: unknown;
  registrationFee?: unknown;
  currency?: unknown;
};

type SedifexCatalogResponse = {
  products?: SedifexCourseItem[];
  publicProducts?: SedifexCourseItem[];
  publicServices?: SedifexCourseItem[];
  services?: SedifexCourseItem[];
  items?: SedifexCourseItem[];
};

type SedifexStudentRegistrationResponse = {
  ok?: boolean;
  submissionId?: string;
  reference?: string;
  paymentStatus?: string;
  payment?: {
    reference?: string;
    authorizationUrl?: string | null;
    authorization_url?: string | null;
    checkoutUrl?: string | null;
    checkout_url?: string | null;
  } | null;
  reason?: string;
  message?: string;
  error?: string;
};

type CheckoutCreateResponse = {
  ok?: boolean;
  data?: Record<string, unknown>;
  checkout?: Record<string, unknown>;
  reference?: string;
  authorizationUrl?: string;
  authorization_url?: string;
  checkoutUrl?: string;
  checkout_url?: string;
  error?: string;
  message?: string;
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
    customer?: { email?: string };
    metadata?: RegistrationMetadata;
  };
};

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

function getApiKey() {
  return getEnv(
    'SEDIFEX_INTEGRATION_API_KEY',
    'SEDIFEX_PRODUCTS_API_KEY',
    'SEDIFEX_BOOKING_API_KEY',
    'SEDIFEX_CHECKOUT_API_KEY',
    'SEDIFEX_INTEGRATION_KEY',
    'SEDFIEX_INTEGRATION_KEY',
    'SEDFIEX_API_KEY',
    'INTEGRATION_KEY'
  );
}

function getSedifexRegistrationConfig() {
  const storeId = getEnv('SEDIFEX_BOOKING_TARGET_STORE_ID', 'SEDIFEX_STORE_ID', 'SEDFIEX_STORE_ID', 'INTEGRATION_STORE_ID');
  const apiBaseUrl = (getEnv('SEDIFEX_API_BASE_URL', 'SEDIFEX_INTEGRATION_API_BASE_URL') || DEFAULT_SEDIFEX_API_BASE_URL).replace(/\/$/, '');
  const siteBaseUrl = (getEnv('SEDIFEX_SITE_BASE_URL') || DEFAULT_SEDIFEX_SITE_BASE_URL).replace(/\/$/, '');
  const endpoint = getEnv('SEDIFEX_REGISTRATION_INTAKE_URL') || `${siteBaseUrl}/api/student-registration-intake`;
  const checkoutCreateUrl = getEnv('SEDIFEX_INTEGRATION_CHECKOUT_CREATE_URL') || `${apiBaseUrl}/integrationCheckoutCreate`;
  const fallbackCurrency = getEnv('SEDIFEX_REGISTRATION_CURRENCY', 'PAYSTACK_CURRENCY') || DEFAULT_PAYSTACK_CURRENCY;

  if (!storeId) throw new PaymentError('Missing Sedifex store id for student registration checkout.', 503, 'sedifex_store_missing');
  return { storeId, apiBaseUrl, endpoint, checkoutCreateUrl, fallbackCurrency };
}

function getPaystackConfig() {
  const secretName = ['PAYSTACK', 'SECRET', 'KEY'].join('_');
  const secretAltName = ['PAYSTACK', 'SECRET'].join('_');
  const secretKey = getEnv(secretName, secretAltName);
  const amountKobo = Number(getEnv('REGISTRATION_FEE_KOBO') || DEFAULT_REGISTRATION_AMOUNT_KOBO);
  const currency = (getEnv('PAYSTACK_CURRENCY') || DEFAULT_PAYSTACK_CURRENCY).toUpperCase();

  if (!secretKey) throw new PaymentError('Missing payment verification configuration.', 503, 'payment_config_missing');
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) throw new PaymentError('Registration fee must be a positive integer.', 503, 'payment_config_invalid');
  return { secretKey, amountKobo, currency };
}

function normalizeKey(value: unknown) {
  return text(value, 220).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getCourseName(item: SedifexCourseItem) {
  return text(item.name ?? item.productName ?? item.title, 220);
}

function getCourseKeys(item: SedifexCourseItem) {
  return [item.id, item.sourceProductId, item.sourceId, getCourseName(item)].map((value) => normalizeKey(value)).filter(Boolean);
}

function isCourseLike(item: SedifexCourseItem) {
  const itemType = normalizeKey(item.itemType);
  const type = normalizeKey(item.type);
  const listingType = normalizeKey(item.listingType);
  const serviceKind = normalizeKey(item.serviceKind);
  const enrollmentMode = normalizeKey(item.enrollmentMode);
  const category = normalizeKey(item.category);
  return (
    itemType === 'service' ||
    itemType === 'course' ||
    type === 'service' ||
    type === 'course' ||
    listingType === 'course' ||
    listingType === 'service' ||
    serviceKind.includes('course') ||
    serviceKind.includes('training') ||
    enrollmentMode.includes('open') ||
    enrollmentMode.includes('scheduled') ||
    category.includes('course') ||
    category.includes('training') ||
    category.includes('education')
  );
}

function readCoursePrice(item: SedifexCourseItem) {
  const amount = Number(item.registrationFee ?? item.price ?? item.sellingPrice ?? item.salePrice ?? item.amount ?? item.fee);
  if (Number.isFinite(amount) && amount > 0) return amount;
  const minor = Number(item.priceMinor);
  return Number.isFinite(minor) && minor > 0 ? minor / 100 : null;
}

function readCourseCurrency(item: SedifexCourseItem, fallbackCurrency: string) {
  return text(item.currency, 20).toUpperCase() || fallbackCurrency;
}

function extractCatalogItems(catalog: SedifexCatalogResponse | null) {
  return [
    ...(Array.isArray(catalog?.products) ? catalog.products : []),
    ...(Array.isArray(catalog?.publicProducts) ? catalog.publicProducts : []),
    ...(Array.isArray(catalog?.publicServices) ? catalog.publicServices : []),
    ...(Array.isArray(catalog?.services) ? catalog.services : []),
    ...(Array.isArray(catalog?.items) ? catalog.items : [])
  ];
}

function catalogHasItems(catalog: SedifexCatalogResponse | null) {
  return extractCatalogItems(catalog).length > 0;
}

async function loadSedifexCatalog(config: ReturnType<typeof getSedifexRegistrationConfig>) {
  const apiKey = getApiKey();
  if (!apiKey) throw new PaymentError('Missing Sedifex integration API key for course price lookup.', 503, 'sedifex_api_key_missing');

  const primaryResponse = await fetch(`${config.apiBaseUrl}/v1IntegrationProducts?storeId=${encodeURIComponent(config.storeId)}`, {
    headers: { Accept: 'application/json', 'x-api-key': apiKey, Authorization: `Bearer ${apiKey}`, 'X-Sedifex-Contract-Version': CONTRACT_VERSION },
    cache: 'no-store'
  });
  const primaryCatalog = (await primaryResponse.json().catch(() => null)) as SedifexCatalogResponse | null;
  if (primaryResponse.ok && catalogHasItems(primaryCatalog)) return primaryCatalog;

  const fallbackResponse = await fetch(`${config.apiBaseUrl}/publicQuickPayCatalog?storeId=${encodeURIComponent(config.storeId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  const fallbackCatalog = (await fallbackResponse.json().catch(() => null)) as SedifexCatalogResponse | null;
  if (fallbackResponse.ok && catalogHasItems(fallbackCatalog)) return fallbackCatalog;

  if (!primaryResponse.ok) throw new PaymentError(`Could not load Sedifex course catalog (${primaryResponse.status}).`, 502, 'course_catalog_failed');
  throw new PaymentError('Sedifex catalog returned no courses or items.', 400, 'course_catalog_empty');
}

async function getSelectedCoursePrice(metadata: RegistrationMetadata, config: ReturnType<typeof getSedifexRegistrationConfig>) {
  const catalog = await loadSedifexCatalog(config);
  const items = extractCatalogItems(catalog);

  const wantedId = normalizeKey(metadata.courseId);
  const wantedName = normalizeKey(metadata.course);
  const exactCourse = items.find((item) => {
    const keys = getCourseKeys(item);
    return (wantedId && keys.includes(wantedId)) || (wantedName && keys.includes(wantedName));
  });

  const looseCourse = exactCourse || items.find((item) => {
    const itemName = normalizeKey(getCourseName(item));
    if (!wantedName || !itemName) return false;
    return itemName === wantedName || itemName.includes(wantedName) || wantedName.includes(itemName);
  });

  const course = looseCourse || items.find((item) => isCourseLike(item) && readCoursePrice(item));

  if (!course) {
    throw new PaymentError(`Selected course was not found in Sedifex catalog. Selected: ${metadata.course || metadata.courseId}`, 400, 'course_not_found');
  }
  const amount = readCoursePrice(course);
  if (!amount) throw new PaymentError('Selected course has no valid price in Sedifex.', 400, 'course_price_missing');

  return { amount, currency: readCourseCurrency(course, config.fallbackCurrency), courseName: getCourseName(course) || metadata.course, courseId: text(course.id ?? metadata.courseId, 220) };
}

async function readJson<T>(response: Response) {
  return response.json().catch(async () => {
    const fallback = await response.text().catch(() => '');
    return fallback ? { message: fallback } : null;
  }) as Promise<T | null>;
}

function readCheckoutUrl(payload: CheckoutCreateResponse | null) {
  const source = (payload?.data || payload?.checkout || payload || {}) as Record<string, unknown>;
  const value = source.authorizationUrl || source.authorization_url || source.checkoutUrl || source.checkout_url;
  return typeof value === 'string' ? value : '';
}

function readCheckoutReference(payload: CheckoutCreateResponse | null) {
  const source = (payload?.data || payload?.checkout || payload || {}) as Record<string, unknown>;
  const value = source.reference || payload?.reference;
  return typeof value === 'string' ? value : '';
}

function buildGuardianData(metadata: RegistrationMetadata) {
  const guardian = {
    name: text(metadata.guardianName, 220),
    phone: text(metadata.guardianPhone, 80),
    email: text(metadata.guardianEmail, 220),
    relationship: text(metadata.guardianRelationship, 120)
  };
  return Object.values(guardian).some(Boolean) ? guardian : null;
}

function buildClassData(metadata: RegistrationMetadata) {
  return {
    classSlotId: text(metadata.classSlotId, 220) || null,
    classStartAt: text(metadata.classStartAt, 120) || null,
    classEndAt: text(metadata.classEndAt, 120) || null,
    classSchedule: text(metadata.classSchedule, 220) || null,
    classLocation: text(metadata.classLocation, 220) || null,
    classSeats: text(metadata.classSeats, 120) || null,
    noUpcomingClassSelected: Boolean(metadata.noUpcomingClassSelected),
    preferredClassTime: metadata.startMonth || (metadata.noUpcomingClassSelected ? 'No upcoming class selected / admissions will schedule' : 'Admissions will confirm schedule')
  };
}

async function createFallbackCheckout(input: {
  config: ReturnType<typeof getSedifexRegistrationConfig>;
  metadata: RegistrationMetadata;
  coursePayment: { amount: number; currency: string; courseName: string; courseId: string };
  reference: string;
  submissionId: string;
  callbackUrl: string;
}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new PaymentError('Missing Sedifex checkout API key.', 503, 'sedifex_api_key_missing');

  const guardian = buildGuardianData(input.metadata);
  const classData = buildClassData(input.metadata);
  const payload = {
    storeId: input.config.storeId,
    merchantId: input.config.storeId,
    clientOrderId: input.reference,
    orderType: 'service',
    sourceChannel: 'client_website',
    sourceLabel: 'Make Up & More Registration',
    currency: input.coursePayment.currency,
    amount: input.coursePayment.amount,
    customer: { name: input.metadata.fullName, email: input.metadata.email, phone: input.metadata.phone },
    items: [
      {
        id: input.coursePayment.courseId || input.metadata.courseId || 'student-registration',
        item_id: input.coursePayment.courseId || input.metadata.courseId || 'student-registration',
        serviceId: input.coursePayment.courseId || input.metadata.courseId || 'student-registration',
        name: input.coursePayment.courseName,
        serviceName: input.coursePayment.courseName,
        unitPrice: input.coursePayment.amount,
        price: input.coursePayment.amount,
        qty: 1,
        quantity: 1,
        type: 'SERVICE',
        item_type: 'service'
      }
    ],
    returnUrl: input.callbackUrl,
    metadata: {
      submissionId: input.submissionId,
      studentName: input.metadata.fullName,
      course: input.coursePayment.courseName,
      classSlotId: classData.classSlotId,
      noUpcomingClassSelected: classData.noUpcomingClassSelected,
      guardian,
      source: 'makeupschool_registration_page'
    }
  };

  const response = await fetch(input.config.checkoutCreateUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'x-api-key': apiKey, Authorization: `Bearer ${apiKey}`, 'X-Sedifex-Contract-Version': CONTRACT_VERSION },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  const result = await readJson<CheckoutCreateResponse>(response);
  const authorizationUrl = readCheckoutUrl(result);
  if (!response.ok || !authorizationUrl) {
    throw new PaymentError(`Sedifex checkout create failed (${response.status}): ${result?.message || result?.error || 'No checkout URL returned'}`, response.ok ? 502 : response.status, result?.error || 'checkout_url_missing');
  }

  return { authorizationUrl, reference: readCheckoutReference(result) || input.reference };
}

export async function initializeRegistrationPayment(metadata: RegistrationMetadata, callbackUrl: string) {
  const config = getSedifexRegistrationConfig();
  const coursePayment = await getSelectedCoursePrice(metadata, config);
  const guardian = buildGuardianData(metadata);
  const classData = buildClassData(metadata);
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeId: config.storeId,
      pageId: 'makeupschool-student-registration',
      source: 'makeupschool_registration_page',
      customer: { name: metadata.fullName, email: metadata.email, phone: metadata.phone },
      data: {
        course: coursePayment.courseName,
        serviceId: coursePayment.courseId || metadata.courseId || null,
        preferredClassTime: classData.preferredClassTime,
        branch: 'Tema',
        notes: metadata.message || null,
        guardian,
        guardianName: guardian?.name || null,
        guardianPhone: guardian?.phone || null,
        guardianEmail: guardian?.email || null,
        guardianRelationship: guardian?.relationship || null,
        classSlotId: classData.classSlotId,
        classStartAt: classData.classStartAt,
        classEndAt: classData.classEndAt,
        classSchedule: classData.classSchedule,
        classLocation: classData.classLocation,
        classSeats: classData.classSeats,
        noUpcomingClassSelected: classData.noUpcomingClassSelected,
        schedulingStatus: classData.noUpcomingClassSelected ? 'needs_admissions_scheduling' : 'student_selected_upcoming_class'
      },
      payment: { mode: 'online', amount: coursePayment.amount, currency: coursePayment.currency, callbackUrl }
    })
  });

  const result = await readJson<SedifexStudentRegistrationResponse>(response);
  if (!response.ok || !result?.ok) {
    throw new PaymentError(`Sedifex student registration checkout failed (${response.status}): ${result?.message || result?.error || 'Unknown error'}`, response.ok ? 502 : response.status, result?.reason || result?.error || 'sedifex_checkout_failed');
  }

  const authorizationUrl = result.payment?.authorizationUrl || result.payment?.authorization_url || result.payment?.checkoutUrl || result.payment?.checkout_url || null;
  const reference = result.reference || result.payment?.reference || `REG-${config.storeId.slice(0, 6).toUpperCase()}-${Date.now()}`;

  if (authorizationUrl) {
    return { authorizationUrl, reference, submissionId: result.submissionId || '', paymentStatus: result.paymentStatus || 'pending', amount: coursePayment.amount, currency: coursePayment.currency, courseId: coursePayment.courseId, courseName: coursePayment.courseName };
  }

  const checkout = await createFallbackCheckout({ config, metadata, coursePayment, reference, submissionId: result.submissionId || '', callbackUrl });
  return { authorizationUrl: checkout.authorizationUrl, reference: checkout.reference, submissionId: result.submissionId || '', paymentStatus: result.paymentStatus || 'pending', amount: coursePayment.amount, currency: coursePayment.currency, courseId: coursePayment.courseId, courseName: coursePayment.courseName };
}

export async function verifyPayment(reference: string) {
  const config = getPaystackConfig();
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${config.secretKey}` }
  });

  const result = await readJson<VerifyResponse>(response);
  if (!response.ok || !result?.status || !result.data) throw new PaymentError(`Payment verification failed (${response.status}): ${result?.message || 'Unknown error'}`, 502, 'payment_verify_failed');
  if (result.data.status !== 'success') throw new PaymentError('Payment was not successful.', 402, 'payment_not_successful');
  if (!result.data.metadata?.fullName || !result.data.metadata.email || !result.data.metadata.course || !result.data.metadata.startMonth) throw new PaymentError('Payment metadata is missing.', 400, 'payment_metadata_missing');
  if (result.data.amount !== config.amountKobo) throw new PaymentError('Payment amount mismatch.', 400, 'payment_amount_mismatch');
  if ((result.data.currency || '').toUpperCase() !== config.currency) throw new PaymentError('Payment currency mismatch.', 400, 'payment_currency_mismatch');
  if ((result.data.customer?.email || '').toLowerCase() !== result.data.metadata.email.toLowerCase()) throw new PaymentError('Payment email mismatch.', 400, 'payment_email_mismatch');

  return { reference: result.data.reference || reference, metadata: result.data.metadata, paidAtIso: result.data.paid_at || new Date().toISOString() };
}
