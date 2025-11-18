import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import { supabase } from "../../lib/supabase";
import type { ShopifyOrder } from "../../lib/shopify";
import {
  aggregateKpis,
  transformShopifyOrder,
  type ShopifyOrderRow,
} from "../../lib/transformers";
import { logJob } from "../../lib/logger";
import { normalizeShopDomain } from "../../lib/shopify-utils";

function verifyWebhook(payload: string, hmac: string | null): boolean {
  if (!hmac || !process.env.SHOPIFY_API_SECRET) {
    return false;
  }

  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(payload, "utf8")
    .digest("base64");

  // Compare using timing-safe comparison
  // Both are base64 strings, so we compare them as buffers
  const calculatedBuffer = Buffer.from(calculatedHmac, "base64");
  const receivedBuffer = Buffer.from(hmac, "base64");

  if (calculatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(calculatedBuffer, receivedBuffer);
}

async function findTenantByShop(shopDomain: string): Promise<string> {
  // Normalize shop domain using consistent function
  const normalizedDomain = normalizeShopDomain(shopDomain);

  // Fetch all Shopify connections
  const { data: allConnections, error } = await supabase
    .from("connections")
    .select("tenant_id, meta")
    .eq("source", "shopify")
    .eq("status", "connected");

  if (error) {
    throw new Error(`Failed to fetch connections: ${error.message}`);
  }

  if (!allConnections || allConnections.length === 0) {
    throw new Error(`No connected Shopify stores found`);
  }

  // Try to find matching connection by shop domain in meta (exact match preferred)
  for (const conn of allConnections) {
    const meta = conn.meta as { shop?: string; store_domain?: string } | null;
    if (meta) {
      const existingShopDomain = normalizeShopDomain(
        meta.store_domain || meta.shop || "",
      );

      // Exact match only for security
      if (existingShopDomain === normalizedDomain) {
        return conn.tenant_id as string;
}
    }
  }

  throw new Error(`No tenant mapped to shop domain: ${normalizedDomain}`);
}

async function recalcKpis(tenantId: string, date: string | null): Promise<void> {
  if (!date) {
    return;
  }

  const { data, error } = await supabase
    .from("shopify_orders")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("processed_at", date);

  if (error) {
    throw new Error(`Failed to fetch orders for KPI recalculation: ${error.message}`);
  }

  const typed = (data || []) as ShopifyOrderRow[];

  if (!typed.length) {
    // No orders for this date, remove KPI entry if it exists
    const { error: deleteError } = await supabase
      .from("kpi_daily")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("date", date)
      .eq("source", "shopify");

    if (deleteError) {
      console.warn(`Failed to delete empty KPI entry: ${deleteError.message}`);
    }
    return;
  }

  // Recalculate and upsert KPIs
  const kpiRows = aggregateKpis(typed);
  const { error: upsertError } = await supabase
    .from("kpi_daily")
    .upsert(kpiRows, { onConflict: "tenant_id,date,source" });

  if (upsertError) {
    throw new Error(`Failed to upsert KPIs: ${upsertError.message}`);
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, { status: 405 });
  }

  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");

  // Verify HMAC signature
  if (!verifyWebhook(rawBody, hmac)) {
    console.error("Webhook HMAC verification failed", {
      shop: shopDomain,
      topic,
      hasHmac: !!hmac,
    });
    return json({ message: "Invalid signature" }, { status: 401 });
  }

  if (!shopDomain) {
    return json({ message: "Missing shop header" }, { status: 400 });
  }

  if (!topic) {
    return json({ message: "Missing topic header" }, { status: 400 });
  }

  // Only handle orders/create and orders/updated
  if (topic !== "orders/create" && topic !== "orders/updated") {
    console.warn(`Unhandled webhook topic: ${topic}`);
    return json({ message: "Topic not handled" }, { status: 200 }); // Return 200 to acknowledge
  }

  let tenantId: string | null = null;
  try {
    // Find tenant by shop domain
    tenantId = await findTenantByShop(shopDomain);

    // Parse and transform order
    const payload = JSON.parse(rawBody) as ShopifyOrder;
    const orderRow = transformShopifyOrder(payload, tenantId);

    // Upsert order
    const { error: upsertError } = await supabase
      .from("shopify_orders")
      .upsert(orderRow, { onConflict: "order_id" });

    if (upsertError) {
      throw new Error(`Failed to upsert order: ${upsertError.message}`);
    }

    // Recalculate KPIs for the order date
    await recalcKpis(tenantId, orderRow.processed_at);

    console.log(`Webhook processed successfully: ${topic} for order ${orderRow.order_id}`);
    try {
      await logJob({
        tenant_id: tenantId,
        status: "succeeded",
        source: "shopify_webhook",
      });
    } catch (logError) {
      console.error("Unable to log webhook success", logError);
    }
    return json({ success: true, topic, orderId: orderRow.order_id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook handling failed", {
      shop: shopDomain,
      topic,
      tenantId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Log to jobs_log if we have a tenantId
    if (tenantId) {
      try {
        await logJob({
          tenant_id: tenantId,
          status: "failed",
          error: errorMessage,
          source: "shopify_webhook",
        });
      } catch (logError) {
        console.error("Unable to log webhook failure", logError);
      }
    }

    // Return 500 so Shopify will retry
    return json(
      {
        message: "Webhook processing failed",
        error: errorMessage,
      },
      { status: 500 },
    );
  }
};
