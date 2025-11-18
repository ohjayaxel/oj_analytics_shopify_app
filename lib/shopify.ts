const API_VERSION = "2025-10";

export type ShopifyRestResource = Record<string, unknown>;

export interface ShopifyOrderResponse {
  orders: ShopifyOrder[];
}

export interface ShopifyOrder {
  id: number;
  processed_at?: string;
  total_price?: string;
  total_discounts?: string;
  currency?: string;
  customer?: {
    id?: number;
  } | null;
  financial_status?: string;
}

export interface ShopifyShopResponse {
  shop: {
    id: number;
    domain: string;
    name: string;
    currency: string;
  };
}

export interface ShopifyResponse<T> {
  data: T;
  headers: Headers;
}

export async function shopifyRequest<T>(
  shopDomain: string,
  accessToken: string,
  resource: string,
  params?: URLSearchParams,
): Promise<ShopifyResponse<T>> {
  const url = new URL(`https://${shopDomain}/admin/api/${API_VERSION}/${resource}`);
  if (params) {
    url.search = params.toString();
  }

  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Shopify API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as T;
  return { data, headers: response.headers };
}

export interface ShopifyOrderResponseWithHeaders extends ShopifyOrderResponse {
  headers: Headers;
}

export async function fetchOrders(
  shopDomain: string,
  accessToken: string,
  params?: URLSearchParams,
): Promise<ShopifyOrderResponseWithHeaders> {
  const response = await shopifyRequest<ShopifyOrderResponse>(
    shopDomain,
    accessToken,
    "orders.json",
    params,
  );
  return {
    ...response.data,
    headers: response.headers,
  };
}

export async function fetchShop(shopDomain: string, accessToken: string) {
  const response = await shopifyRequest<ShopifyShopResponse>(
    shopDomain,
    accessToken,
    "shop.json",
  );
  return response.data;
}
