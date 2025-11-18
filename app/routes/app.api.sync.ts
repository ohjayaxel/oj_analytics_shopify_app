import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { decryptSecret } from "../../lib/encryption";
import { fetchOrders, fetchShop, type ShopifyOrder } from "../../lib/shopify";
import { supabase } from "../../lib/supabase";
import {
  aggregateKpis,
  transformShopifyOrder,
} from "../../lib/transformers";
import { logJob, createJob } from "../../lib/logger";
import { normalizeShopDomain } from "../../lib/shopify-utils";

function assertAuthorized(request: Request) {
  const header = request.headers.get("authorization") || "";
  const expected = process.env.SYNC_SERVICE_KEY;
  if (!expected || header !== `Bearer ${expected}`) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

interface SyncPayload {
  tenantId: string;
  shopDomain: string;
}

function normalizeBuffer(value: unknown): Buffer {
  if (value instanceof Buffer) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === "string") {
    return Buffer.from(value, "base64");
  }
  throw new Error("Unsupported token format");
}

async function fetchConnection(tenantId: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("access_token_enc, meta, status")
    .eq("tenant_id", tenantId)
    .eq("source", "shopify")
    .eq("status", "connected")
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      `No connected Shopify account found for tenant ${tenantId}: ${error?.message || "Not found"}`,
    );
  }
  return data;
}

async function upsertOrders(rows: ReturnType<typeof transformShopifyOrder>[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("shopify_orders").upsert(rows, { onConflict: "order_id" });
  if (error) {
    throw new Error(`Failed to upsert orders: ${error.message}`);
  }
}

async function upsertShop(tenantId: string, shopDomain: string, accessToken: string) {
  const shopResponse = await fetchShop(shopDomain, accessToken);
  const { error } = await supabase.from("shopify_shops").upsert(
    {
      tenant_id: tenantId,
      external_id: shopResponse.shop.id.toString(),
      domain: shopResponse.shop.domain,
      name: shopResponse.shop.name,
      currency: shopResponse.shop.currency,
    },
    { onConflict: "tenant_id,external_id" },
  );
  if (error) {
    throw new Error(`Failed to upsert shop: ${error.message}`);
  }
}

async function upsertKpis(rows: ReturnType<typeof aggregateKpis>) {
  if (!rows.length) return;
  const { error } = await supabase
    .from("kpi_daily")
    .upsert(rows, { onConflict: "tenant_id,date,source" });
  if (error) {
    throw new Error(`Failed to upsert KPIs: ${error.message}`);
  }
}

function extractPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  // Shopify uses Link header format: <url>; rel="next"
  const nextMatch = linkHeader.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  if (nextMatch && nextMatch[1]) {
    return decodeURIComponent(nextMatch[1]);
  }

  return null;
}

async function fetchAllOrders(
  shopDomain: string,
  accessToken: string,
  limit: number = 250,
  maxPages: number = 50, // Safety limit: 50 pages = 12,500 orders
): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let pageInfo: string | null = null;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      status: "any",
    });

    if (pageInfo) {
      params.set("page_info", pageInfo);
    }

    const response = await fetchOrders(shopDomain, accessToken, params);
    allOrders.push(...response.orders);

    // Check for next page using Link header
    const linkHeader = response.headers?.get("link");
    pageInfo = extractPageInfo(linkHeader);

    if (!pageInfo || response.orders.length < limit) {
      // No more pages or got fewer orders than limit
      break;
    }

    pageCount++;
  }

  if (pageCount >= maxPages) {
    console.warn(
      `Reached pagination limit (${maxPages} pages), fetched ${allOrders.length} orders`,
    );
  }

  return allOrders;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  assertAuthorized(request);

  const body = (await request.json()) as SyncPayload;
  if (!body?.tenantId || !body?.shopDomain) {
    return json({ message: "tenantId and shopDomain required" }, { status: 400 });
  }

  let jobId: number | undefined;
  try {
    // Normalize shop domain
    const normalizedShopDomain = normalizeShopDomain(body.shopDomain);

    // Create job log entry
    jobId = await createJob(body.tenantId, "shopify");

    // Fetch connection and decrypt token
    const connection = await fetchConnection(body.tenantId);

    // Validate that shopDomain matches the connection
    const connectionShopDomain = normalizeShopDomain(
      (connection.meta as { store_domain?: string; shop?: string } | null)?.store_domain ||
        (connection.meta as { store_domain?: string; shop?: string } | null)?.shop ||
        "",
    );

    if (connectionShopDomain !== normalizedShopDomain) {
      throw new Error(
        `Shop domain mismatch: requested ${normalizedShopDomain} but tenant is connected to ${connectionShopDomain}`,
      );
    }

    const decryptedToken = decryptSecret(normalizeBuffer(connection.access_token_enc));

    // Fetch all orders (with pagination) - use normalized domain
    const allOrders = await fetchAllOrders(normalizedShopDomain, decryptedToken);
    
    if (allOrders.length === 0) {
      await logJob({
        tenant_id: body.tenantId,
        status: "succeeded",
        job_id: jobId,
      });
      return json({ synced: 0, message: "No orders found" });
    }

    // Transform orders
    const orderRows = allOrders.map((order) => transformShopifyOrder(order, body.tenantId));

    // Upsert data in parallel - use normalized domain
    await Promise.all([
      upsertOrders(orderRows),
      upsertShop(body.tenantId, normalizedShopDomain, decryptedToken),
      upsertKpis(aggregateKpis(orderRows)),
    ]);

    // Update job log with success
    await logJob({
      tenant_id: body.tenantId,
      status: "succeeded",
      job_id: jobId,
    });

    return json({
      synced: orderRows.length,
      message: `Successfully synced ${orderRows.length} orders`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Manual sync failed", {
      tenantId: body.tenantId,
      shopDomain: body.shopDomain,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update job log with failure
    if (jobId) {
      await logJob({
        tenant_id: body.tenantId,
        status: "failed",
        error: errorMessage,
        job_id: jobId,
      });
    } else {
      // If job creation failed, try to log anyway
      await logJob({
        tenant_id: body.tenantId,
        status: "failed",
        error: errorMessage,
      });
    }

    return json(
      {
        message: "Sync failed",
        error: errorMessage,
      },
      { status: 500 },
    );
  }
};
