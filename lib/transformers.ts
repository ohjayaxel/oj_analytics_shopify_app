import type { ShopifyOrder } from "./shopify";

export interface ShopifyOrderRow {
  tenant_id: string;
  order_id: string;
  processed_at: string | null;
  total_price: number;
  discount_total: number;
  currency: string | null;
  customer_id: string | null;
  is_refund: boolean;
}

export interface KpiDailyRow {
  tenant_id: string;
  date: string;
  source: "shopify";
  revenue: number;
  conversions: number;
  spend: number | null;
  clicks: number | null;
  cos: number | null;
  roas: number | null;
  aov: number | null;
}

export function transformShopifyOrder(
  order: ShopifyOrder,
  tenantId: string,
): ShopifyOrderRow {
  const processedAt = order.processed_at
    ? new Date(order.processed_at).toISOString().slice(0, 10)
    : null;
  const totalPrice = parseFloat(order.total_price ?? "0");
  const totalDiscount = parseFloat(order.total_discounts ?? "0");
  const customerId = order.customer?.id ? order.customer.id.toString() : null;
  const isRefund =
    order.financial_status === "refunded" ||
    order.financial_status === "partially_refunded";

  return {
    tenant_id: tenantId,
    order_id: order.id.toString(),
    processed_at: processedAt,
    total_price: totalPrice,
    discount_total: totalDiscount,
    currency: order.currency ?? null,
    customer_id: customerId,
    is_refund: Boolean(isRefund),
  };
}

export function aggregateKpis(rows: ShopifyOrderRow[]): KpiDailyRow[] {
  const byDate = new Map<string, ShopifyOrderRow[]>();

  for (const row of rows) {
    if (!row.processed_at) continue;
    const list = byDate.get(row.processed_at) ?? [];
    list.push(row);
    byDate.set(row.processed_at, list);
  }

  return Array.from(byDate.entries()).map(([date, orders]) => {
    const revenue = orders.reduce((sum, item) => sum + item.total_price, 0);
    const conversions = orders.filter((item) => !item.is_refund).length;
    const aov = conversions ? revenue / conversions : null;

    return {
      tenant_id: orders[0]?.tenant_id ?? "",
      date,
      source: "shopify",
      revenue,
      conversions,
      spend: null,
      clicks: null,
      cos: null,
      roas: null,
      aov,
    };
  });
}
