const CONTRACT_VERSION = '2026-04-13';

export type FulfillmentType = 'PICKUP' | 'DELIVERY';

export type CheckoutItem = {
  type: 'PRODUCT' | 'SERVICE';
  item_id: string;
  qty: number;
};

export type CheckoutPreviewRequest = {
  merchant_id: string;
  currency: string;
  fulfillment_type: FulfillmentType;
  delivery_address_id?: string | null;
  items: CheckoutItem[];
};

export type CheckoutPricing = {
  subtotal: number;
  tax_total: number;
  delivery_fee: number;
  pre_processing_total: number;
  processing_fee_to_add: number;
  final_total: number;
};

function env(name: string, fallback = '') {
  return process.env[name] || fallback;
}

function getApiBase() {
  return env('SEDIFEX_API_BASE_URL', env('SEDIFEX_INTEGRATION_API_BASE_URL', 'https://us-central1-sedifex-web.cloudfunctions.net')).replace(/\/$/, '');
}

function getStoreId() {
  return env('SEDIFEX_STORE_ID', env('SEDFIEX_STORE_ID', env('INTEGRATION_STORE_ID')));
}

function getKey() {
  return env('SEDIFEX_INTEGRATION_API_KEY', env('SEDIFEX_INTEGRATION_KEY', env('INTEGRATION_KEY')));
}

function mustInt(value: unknown, field: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer minor unit.`);
  }
}

export function normalizeSedifexItemId(rawId: string, storeId: string) {
  const id = rawId.trim();
  const prefix = `${storeId}_`;
  return storeId && id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function baseHeaders() {
  const apiKey = getKey();
  if (!apiKey) throw new Error('Missing SEDIFEX integration API key.');

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Sedifex-Contract-Version': CONTRACT_VERSION,
    'x-api-key': apiKey,
    Authorization: `Bearer ${apiKey}`
  };
}

function ensurePricingIntegers(pricing: CheckoutPricing) {
  mustInt(pricing.subtotal, 'subtotal');
  mustInt(pricing.tax_total, 'tax_total');
  mustInt(pricing.delivery_fee, 'delivery_fee');
  mustInt(pricing.pre_processing_total, 'pre_processing_total');
  mustInt(pricing.processing_fee_to_add, 'processing_fee_to_add');
  mustInt(pricing.final_total, 'final_total');
}

export async function previewCheckout(payload: CheckoutPreviewRequest) {
  const response = await fetch(`${getApiBase()}/checkout/preview`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(`Sedifex preview failed (${response.status}).`);
  ensurePricingIntegers(data as CheckoutPricing);
  return data;
}

export async function createCheckout(input: {
  clientOrderId: string;
  currency: string;
  orderType?: string;
  items: { id: string; name: string; unitPrice: number; qty: number }[];
  amount: number;
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const storeId = getStoreId();
  if (!storeId) throw new Error('Missing store id.');

  const response = await fetch(`${getApiBase()}/integration/checkout/create`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      storeId,
      clientOrderId: input.clientOrderId,
      orderType: input.orderType || 'product',
      currency: input.currency,
      items: input.items.map((item) => ({ ...item, id: normalizeSedifexItemId(item.id, storeId) })),
      amount: input.amount,
      customer: input.customer,
      returnUrl: input.returnUrl,
      metadata: input.metadata || { channel: 'client-website' }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(`Sedifex create checkout failed (${response.status}).`);
  return data;
}

export async function getOrderStatus(reference: string) {
  const response = await fetch(`${getApiBase()}/integration/orders/${encodeURIComponent(reference)}`, {
    headers: baseHeaders(),
    cache: 'no-store'
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(`Sedifex order lookup failed (${response.status}).`);
  return data;
}
