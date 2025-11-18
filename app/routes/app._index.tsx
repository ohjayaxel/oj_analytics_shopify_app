/**
 * Main app page - Simple status view for plug and play integration
 * 
 * Shows connection status and provides a button to connect/reconnect
 * via the main analytics platform.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Badge, BlockStack, Button, Card, InlineStack, Page, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { supabase } from "../../lib/supabase";
import { normalizeShopDomain } from "../../lib/shopify-utils";

type WebhookStatus = "active" | "inactive" | "unknown";

interface ConnectionStatus {
  status: "connected" | "disconnected" | "error" | "unknown";
  shopDomain?: string;
  error?: string;
  connectUrl?: string;
  webhookStatus: WebhookStatus;
  webhookLastEvent?: string | null;
}

interface WebhookLogRow {
  status: string;
  created_at: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Get analytics URL from environment (server-side only)
  const analyticsUrl =
    process.env.NEXT_PUBLIC_ANALYTICS_URL ||
    process.env.APP_BASE_URL ||
    "https://ohjay-dashboard.vercel.app";

  if (!session) {
    return json<ConnectionStatus>({
      status: "unknown",
      connectUrl: `${analyticsUrl}/connect/shopify`,
      webhookStatus: "unknown",
      webhookLastEvent: null,
    });
  }

  try {
    const shopDomain = normalizeShopDomain(session.shop);
    const connectUrl = `${analyticsUrl}/connect/shopify?shop=${encodeURIComponent(shopDomain)}`;

    interface ConnectionRow {
      status: string;
      meta: { shop?: string; store_domain?: string } | null;
      tenant_id?: string;
    }

    const { data: allConnections, error } = await supabase
      .from("connections")
      .select("status, meta, tenant_id")
      .eq("source", "shopify");

    if (error) {
      console.error("Error fetching connection:", error);
      return json<ConnectionStatus>({
        status: "error",
        error: error.message,
        shopDomain,
        connectUrl,
        webhookStatus: "unknown",
        webhookLastEvent: null,
      });
    }

    let matchedConnection: ConnectionRow | null = null;

    // Find matching connection by shop domain
    for (const conn of (allConnections || []) as ConnectionRow[]) {
      const meta = conn.meta as { shop?: string; store_domain?: string } | null;
      if (meta) {
        const existingShopDomain = normalizeShopDomain(
          meta.store_domain || meta.shop || "",
        );

        if (existingShopDomain === shopDomain) {
          matchedConnection = conn;
          break;
        }
      }
    }

    if (!matchedConnection || matchedConnection.status !== "connected") {
      return json<ConnectionStatus>({
        status: "disconnected",
        shopDomain,
        connectUrl,
        webhookStatus: "unknown",
        webhookLastEvent: null,
      });
    }

    const tenantId = matchedConnection.tenant_id;

    let webhookStatus: WebhookStatus = "unknown";
    let webhookLastEvent: string | null = null;

    if (tenantId) {
      const { data: webhookLogRaw, error: webhookError } = await (supabase as any)
        .from("jobs_log")
        .select("status, created_at")
        .eq("tenant_id", tenantId)
        .eq("source", "shopify_webhook")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const webhookLog = webhookLogRaw as WebhookLogRow | null;

      if (webhookError) {
        console.error("Error fetching webhook status:", webhookError);
      } else if (webhookLog) {
        webhookStatus = webhookLog.status === "succeeded" ? "active" : "inactive";
        webhookLastEvent = webhookLog.created_at ?? null;
      }
    }

    return json<ConnectionStatus>({
      status: "connected",
      shopDomain,
      connectUrl,
      webhookStatus,
      webhookLastEvent,
    });
  } catch (error) {
    console.error("Error checking connection status:", error);
    const shopDomain = normalizeShopDomain(session.shop);
    const connectUrl = `${analyticsUrl}/connect/shopify?shop=${encodeURIComponent(shopDomain)}`;
    return json<ConnectionStatus>({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      connectUrl,
      webhookStatus: "unknown",
      webhookLastEvent: null,
    });
  }
};

export default function IntegrationLanding() {
  const status = useLoaderData<typeof loader>();

  const connectUrl = status.connectUrl || "https://ohjay-dashboard.vercel.app/connect/shopify";
  const formattedWebhookTimestamp = status.webhookLastEvent
    ? new Date(status.webhookLastEvent).toLocaleString()
    : null;

  const handleConnect = () => {
    // Break out of iframe before redirecting to OAuth
    // This is required because Shopify blocks OAuth authorization page in iframes
    if (window.top && window.top !== window.self) {
      // We're in an iframe, break out to top-level
      window.top.location.href = connectUrl;
    } else {
      // Not in iframe, redirect normally
      window.location.href = connectUrl;
    }
  };

  const getStatusBadge = () => {
    switch (status.status) {
      case "connected":
        return <Badge tone="success">Connected</Badge>;
      case "disconnected":
        return <Badge tone="attention">Not Connected</Badge>;
      case "error":
        return <Badge tone="critical">Error</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getWebhookBadge = () => {
    switch (status.webhookStatus) {
      case "active":
        return <Badge tone="success">Webhooks Active</Badge>;
      case "inactive":
        return <Badge tone="critical">Webhooks Failing</Badge>;
      default:
        return <Badge>Webhooks Unknown</Badge>;
    }
  };

  return (
    <Page>
      <TitleBar title="OJ Analytics" />
      <BlockStack gap="500">
            <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingLg" as="h1">
                Shopify Integration
              </Text>
              <InlineStack gap="200" align="center">
                {getStatusBadge()}
                {getWebhookBadge()}
              </InlineStack>
            </InlineStack>

            <Text as="p" variant="bodySm" tone="subdued">
              {formattedWebhookTimestamp
                ? `Last webhook event: ${formattedWebhookTimestamp}`
                : "No webhook events received yet."}
            </Text>

            {status.status === "connected" && (
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  Your Shopify store is connected to your analytics platform. Data is automatically
                  syncing in the background.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  To manage your connection settings, visit your analytics platform dashboard.
                  </Text>
                <Button
                  onClick={handleConnect}
                  variant="secondary"
                >
                  Manage Connection
                </Button>
                </BlockStack>
            )}

            {status.status === "disconnected" && (
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  Connect your Shopify store to start syncing data to your analytics platform.
                  </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  You'll be redirected to your analytics platform to complete the connection.
                  </Text>
                    <Button
                  onClick={handleConnect}
                  variant="primary"
                    >
                  Connect Store
                    </Button>
              </BlockStack>
            )}

            {status.status === "error" && (
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd" tone="critical">
                  There was an error checking your connection status.
                    </Text>
                {status.error && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {status.error}
                    </Text>
                )}
                <Button
                  onClick={handleConnect}
                  variant="primary"
                >
                  Try Connecting Again
                </Button>
              </BlockStack>
                )}
              </BlockStack>
            </Card>

              <Card>
                <BlockStack gap="200">
            <Text variant="headingMd" as="h2">
              How it works
                  </Text>
                  <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                <strong>1. Connect:</strong> Click "Connect Store" to link your Shopify store to
                your analytics platform account.
                      </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                <strong>2. Sync:</strong> Once connected, your order data automatically syncs to
                your analytics platform.
                      </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                <strong>3. Analyze:</strong> View and analyze your Shopify data in your analytics
                platform dashboard.
                      </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
      </BlockStack>
    </Page>
  );
}
