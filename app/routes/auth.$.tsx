// KOMMENTERAD UT - OAuth callback hanteras nu i huvudplattformen
// Denna route används inte längre eftersom OAuth callback hanteras i huvudplattformen på /api/oauth/shopify/callback
// Om du behöver stödja Arkitektur A (OAuth direkt från huvudplattformen med state-parameter), uncomment denna fil

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      // If no session, redirect to login
      return redirect("/auth/login");
    }

    // OAuth callback hanteras nu i huvudplattformen
    // Redirect till connect-sidan
    return redirect(`/app/connect?shop=${encodeURIComponent(session.shop)}`);
  } catch (error) {
    // If authentication fails, let Shopify handle it (it will redirect to OAuth)
    // This is normal during the OAuth flow
    console.error("Auth error (may be normal during OAuth):", error);
    return redirect("/app/connect");
  }
};

/* ORIGINAL IMPLEMENTATION (kommenterad ut):
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { encryptSecret } from "../../lib/encryption";
import { supabase } from "../../lib/supabase";
import {
  normalizeShopDomain,
  validateAndDecodeState,
} from "../../lib/shopify-utils";

const callbackRedirect = process.env.APP_BASE_URL || "https://ohjay-dashboard.vercel.app";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    if (!session) {
      // If no session, redirect to login
      return redirect("/auth/login");
    }

  // Check if we have a state parameter (from main platform OAuth initiation)
  const url = new URL(request.url);
  const stateParam = url.searchParams.get("state");

  // If state parameter exists, save connection to Supabase
  if (stateParam) {
    try {
      // Normalize shop domain
      const normalizedShop = normalizeShopDomain(session.shop);

      // Validate and decode state with HMAC verification
      const stateData = validateAndDecodeState(stateParam);
      const { tenantId, shopDomain: expectedShopDomain } = stateData;

      // Validate shop domain matches state
      const normalizedExpectedShop = normalizeShopDomain(expectedShopDomain);
      if (normalizedShop !== normalizedExpectedShop) {
        console.error(
          `OAuth callback: Shop domain mismatch: ${normalizedShop} !== ${normalizedExpectedShop}`,
        );
        // Continue to normal flow, but don't save connection
        return redirect("/app");
      }

      // Check if shop is already connected to a different tenant
      const { data: allConnections } = await supabase
        .from("connections")
        .select("tenant_id, status, meta")
        .eq("source", "shopify")
        .eq("status", "connected");

      if (allConnections) {
        for (const conn of allConnections) {
          const meta = conn.meta as { shop?: string; store_domain?: string } | null;
          if (meta) {
            const existingShopDomain = normalizeShopDomain(
              meta.store_domain || meta.shop || "",
            );

            if (existingShopDomain === normalizedShop && conn.tenant_id !== tenantId) {
              console.error(
                `Shop ${normalizedShop} is already connected to tenant ${conn.tenant_id}`,
              );
              // Don't save, redirect to app
              return redirect("/app");
            }
          }
        }
      }

      const accessTokenEnc = encryptSecret(session.accessToken || "");

      const { error: upsertError } = await supabase.from("connections").upsert(
        {
          tenant_id: tenantId,
          source: "shopify",
          status: "connected",
          access_token_enc: accessTokenEnc.toString("base64"),
          meta: {
            shop: session.shop,
            scope: session.scope,
            store_domain: normalizedShop, // Use normalized domain
            app_installed_at: new Date().toISOString(),
          },
        },
        { onConflict: "tenant_id,source" },
      );

      if (!upsertError) {
        // Redirect to main platform with success
        return redirect(
          callbackRedirect +
            "?status=connected&shop=" +
            encodeURIComponent(session.shop) +
            "&tenantId=" +
            encodeURIComponent(tenantId),
        );
      } else {
        console.error("Failed to save connection:", upsertError);
      }
    } catch (error) {
      console.error("Error processing OAuth callback with state:", error);
      // Continue to normal app flow even if state processing fails
    }
  }

    // Normal OAuth flow - redirect to app
    return redirect("/app");
  } catch (error) {
    // If authentication fails, let Shopify handle it (it will redirect to OAuth)
    // This is normal during the OAuth flow
    console.error("Auth error (may be normal during OAuth):", error);
    return null;
  }
};
*/
