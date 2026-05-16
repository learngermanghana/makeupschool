const CONTRACT_VERSION = '2026-04-13';
const DEFAULT_API_BASE_URL = 'https://us-central1-sedifex-web.cloudfunctions.net';
const DEFAULT_SITE_BASE_URL = 'https://www.sedifex.com';

function getEnv(name: string, fallback?: string) {
  return process.env[name] || fallback || '';
}

function getApiBaseUrl() {
  return getEnv('SEDIFEX_API_BASE_URL', getEnv('SEDIFEX_INTEGRATION_API_BASE_URL', DEFAULT_API_BASE_URL)).replace(/\/$/, '');
}

function getSiteBaseUrl() {
  return getEnv('SEDIFEX_SITE_BASE_URL', DEFAULT_SITE_BASE_URL).replace(/\/$/, '');
}

function getStoreId() {
  return getEnv('SEDIFEX_STORE_ID', getEnv('SEDFIEX_STORE_ID', getEnv('INTEGRATION_STORE_ID')));
}

function getApiKey() {
  return getEnv(
    'SEDIFEX_INTEGRATION_API_KEY',
    getEnv(
      'SEDIFEX_INTEGRATION_KEY',
      getEnv('SEDFIEX_INTEGRATION_KEY', getEnv('SEDFIEX_API_KEY', getEnv('INTEGRATION_KEY')))
    )
  );
}

function buildHeaders(authenticated = false) {
  const headers: HeadersInit = {
    Accept: 'application/json',
    'X-Sedifex-Contract-Version': CONTRACT_VERSION
  };

  if (authenticated) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Missing SEDIFEX integration API key for authenticated endpoint.');
    }
    headers['x-api-key'] = apiKey;
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function sedifexFetch(path: string, authenticated = false, baseUrl = getApiBaseUrl(), cacheMode: 'revalidate' | 'no-store' = 'revalidate') {
  const url = `${baseUrl}${path}`;
  return sedifexFetchUrl(url, authenticated, cacheMode, path);
}

async function sedifexFetchUrl(url: string, authenticated = false, cacheMode: 'revalidate' | 'no-store' = 'revalidate', label = url) {
  const headers = buildHeaders(authenticated);
  const cacheConfig = cacheMode === 'no-store' ? { cache: 'no-store' as const } : { next: { revalidate: 60 } };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers, ...cacheConfig });

    if (response.ok) {
      return response.json();
    }

    const requestId = response.headers.get('x-sedifex-request-id') || 'n/a';
    const body = await response.text().catch(() => '');
    const retryable = response.status >= 500 || response.status === 429;

    if (!retryable || attempt === 2) {
      throw new Error(`Sedifex request failed (${response.status}) for ${label}. requestId=${requestId}. body=${body.slice(0, 240)}`);
    }

    const delayMs = 250 * 2 ** attempt;
    console.warn(`Retrying Sedifex GET ${label} after ${response.status}. requestId=${requestId}. attempt=${attempt + 1}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Sedifex request failed for ${label}`);
}

export type SedifexCatalogItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  price?: number;
  itemType?: string;
  category?: string;
  duration?: string;
  schedule?: string;
  attributes?: Record<string, unknown>;
  updatedAt?: string;
};

export type SedifexAvailabilitySlot = {
  id: string;
  storeId?: string;
  serviceId?: string;
  serviceName?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  capacity?: number;
  seatsBooked?: number;
  seatsRemaining?: number;
  status?: string;
  attributes?: Record<string, unknown>;
  updatedAt?: string;
};

export type SedifexBlogPost = {
  id: string;
  title: string;
  slug: string;
  content?: string;
  linkUrl?: string;
  imageUrl?: string;
  publishedAt?: string;
};

export async function getSedifexIntegrationProducts() {
  const storeId = getStoreId();
  if (!storeId) return null;
  return sedifexFetch(`/v1IntegrationProducts?storeId=${encodeURIComponent(storeId)}`, true);
}

export async function getSedifexGallery() {
  const storeId = getStoreId();
  if (!storeId || !getApiKey()) return null;
  return sedifexFetch(`/integrationGallery?storeId=${encodeURIComponent(storeId)}`, true);
}

export async function getSedifexAvailability(filters: { serviceId?: string; from?: string; to?: string } = {}) {
  const storeId = getStoreId();
  if (!storeId || !getApiKey()) return null;

  const params = new URLSearchParams({ storeId });

  if (filters.serviceId) params.set('serviceId', filters.serviceId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);

  const directAvailabilityUrl = getEnv('SEDIFEX_AVAILABILITY_URL', getEnv('SEDIFEX_INTEGRATION_AVAILABILITY_URL'));
  if (directAvailabilityUrl) {
    const url = `${directAvailabilityUrl.replace(/\/$/, '')}?${params.toString()}`;
    return sedifexFetchUrl(url, true, 'no-store', 'v1IntegrationAvailability');
  }

  return sedifexFetch(`/v1IntegrationAvailability?${params.toString()}`, true, getApiBaseUrl(), 'no-store');
}

export async function getSedifexPublicBlog(slug?: string) {
  const storeId = getStoreId();
  if (!storeId) return null;
  const params = new URLSearchParams({ storeId });
  if (slug) params.set('slug', slug);
  return sedifexFetch(`/api/public-blog?${params.toString()}`, false, getSiteBaseUrl());
}