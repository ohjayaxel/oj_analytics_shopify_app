// KOMMENTERAD UT - OAuth callback hanteras nu i huvudplattformen
// Denna route används inte längre eftersom OAuth callback hanteras i huvudplattformen på /api/oauth/shopify/callback
// Om du behöver stödja Arkitektur A (OAuth direkt från huvudplattformen med state-parameter), uncomment denna fil

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // OAuth callback hanteras nu i huvudplattformen
  // Redirect till connect-sidan om användaren kommer hit
  const { session } = await authenticate.admin(request);
  if (session) {
    return redirect(`/app/connect?shop=${encodeURIComponent(session.shop)}`);
  }
  return redirect("/app/connect");
}

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

export async function loader({ request }: LoaderFunctionArgs) {
  // Shopify App Bridge handles OAuth automatically, so we get the session here
  const { session } = await authenticate.admin(request);

  if (!session) {
    throw new Response("No session found", { status: 401 });
  }

  const url = new URL(request.url);
  const stateParam = url.searchParams.get("state");

  if (!stateParam) {
    console.error("OAuth callback: Missing state parameter");
    return redirect(
      callbackRedirect + "?error=missing_state&shop=" + encodeURIComponent(session.shop),
    );
  }

  // Normalize shop domain from session
  const normalizedShop = normalizeShopDomain(session.shop);

  let stateData;
  try {
    // Validate and decode state with HMAC verification
    stateData = validateAndDecodeState(stateParam);
  } catch (error) {
    console.error("OAuth callback: State validation failed", error);
    return redirect(
      callbackRedirect +
        "?error=invalid_state&shop=" +
        encodeURIComponent(session.shop) +
        "&message=" +
        encodeURIComponent(error instanceof Error ? error.message : "State validation failed"),
    );
  }

  const { tenantId, shopDomain: expectedShopDomain } = stateData;

  // Validate shop domain matches state
  const normalizedExpectedShop = normalizeShopDomain(expectedShopDomain);
  if (normalizedShop !== normalizedExpectedShop) {
    console.error(
      `OAuth callback: Shop domain mismatch: ${normalizedShop} !== ${normalizedExpectedShop}`,
    );
    return redirect(
      callbackRedirect +
        "?error=shop_mismatch&shop=" +
        encodeURIComponent(session.shop) +
        "&message=" +
        encodeURIComponent("Shop domain does not match OAuth state"),
    );
  }

  try {
    // Check if shop is already connected to a different tenant
    // Get all Shopify connections and check for shop domain match
    const { data: allConnections, error: lookupError } = await supabase
      .from("connections")
      .select("tenant_id, status, meta")
      .eq("source", "shopify")
      .eq("status", "connected");

    if (lookupError) {
      console.error("Error checking existing connections:", lookupError);
    }

    // Check if any connection exists with this shop domain
    if (allConnections) {
      for (const conn of allConnections) {
        const meta = conn.meta as { shop?: string; store_domain?: string } | null;
        if (meta) {
          const existingShopDomain = normalizeShopDomain(
            meta.store_domain || meta.shop || "",
          );

          if (existingShopDomain === normalizedShop) {
            // Shop is already connected
            if (conn.tenant_id !== tenantId) {
              // Shop is connected to a different tenant - REJECT
              console.error(
                `Shop ${normalizedShop} is already connected to tenant ${conn.tenant_id}, cannot connect to ${tenantId}`,
              );
              return redirect(
                callbackRedirect +
                  "?error=shop_already_connected&shop=" +
                  encodeURIComponent(session.shop) +
                  "&message=" +
                  encodeURIComponent(
                    "This Shopify store is already connected to another account. Please disconnect it first.",
                  ),
              );
            }
            // Same tenant, will update existing connection
            break;
          }
        }
      }
    }

    // Encrypt the access token from the session
    const accessTokenEnc = encryptSecret(session.accessToken || "");

    // Save connection to Supabase
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

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      throw new Error("Failed to save connection to Supabase");
    }

    // Redirect back to main platform with success status
    return redirect(
      callbackRedirect +
        "?status=connected&shop=" +
        encodeURIComponent(session.shop) +
        "&tenantId=" +
        encodeURIComponent(tenantId),
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return redirect(
      callbackRedirect +
        "?error=oauth_failed&shop=" +
        encodeURIComponent(session.shop) +
        "&message=" +
        encodeURIComponent(error instanceof Error ? error.message : "Unknown error"),
    );
  }
}
*/
