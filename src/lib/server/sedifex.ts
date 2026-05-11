const CONTRACT_VERSION = '2026-04-13';
const DEFAULT_BASE_URL = 'https://us-central1-sedifex-web.cloudfunctions.net';

function getEnv(name: string, fallback?: string) {
  return process.env[name] || fallback || '';
}

function getBaseUrl() {
  return getEnv('SEDIFEX_API_BASE_URL', getEnv('SEDIFEX_INTEGRATION_API_BASE_URL', DEFAULT_BASE_URL)).replace(/\/$/, '');
}

function getStoreId() {
  return getEnv('SEDIFEX_STORE_ID');
}

function getApiKey() {
  return getEnv('SEDIFEX_INTEGRATION_API_KEY', getEnv('SEDIFEX_INTEGRATION_KEY'));
}

async function sedifexFetch(path: string, authenticated = false) {
  const baseUrl = getBaseUrl();
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
  }

  const response = await fetch(`${baseUrl}${path}`, { headers, next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Sedifex request failed (${response.status}) for ${path}`);
  return response.json();
}

export type SedifexCatalogItem = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  price?: number;
  itemType?: string;
  updatedAt?: string;
};

export async function getSedifexIntegrationProducts() {
  const storeId = getStoreId();
  if (!storeId) return null;
  return sedifexFetch(`/v1IntegrationProducts?storeId=${encodeURIComponent(storeId)}`, true);
}

export async function getSedifexGallery() {
  const storeId = getStoreId();
  if (!storeId) return null;
  return sedifexFetch(`/integrationGallery?storeId=${encodeURIComponent(storeId)}`);
}

export async function getSedifexAvailability() {
  const storeId = getStoreId();
  if (!storeId || !getApiKey()) return null;
  return sedifexFetch(`/v1IntegrationAvailability?storeId=${encodeURIComponent(storeId)}`, true);
}
