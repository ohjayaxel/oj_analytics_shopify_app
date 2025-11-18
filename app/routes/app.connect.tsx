/**
 * Connect route - Redirectar till huvudplattformens connect-sida
 *
 * Denna route tar emot shop domain som query parameter och redirectar
 * användaren till huvudplattformens /connect/shopify sida där
 * tenant-val och OAuth-koppling hanteras.
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Authenticate to get shop from session
  const { session } = await authenticate.admin(request);

  if (!session) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || session.shop;

  // Validera att shop parameter finns
  if (!shop) {
    // Redirect till app home med felmeddelande
    return redirect("/app?error=missing_shop");
  }

  // Huvudplattformens URL (sätt i environment variables)
  const analyticsUrl =
    process.env.NEXT_PUBLIC_ANALYTICS_URL ||
    process.env.APP_BASE_URL ||
    "https://ohjay-dashboard.vercel.app";

  // Skapa connect URL med shop domain som query parameter
  const connectUrl = `${analyticsUrl}/connect/shopify?shop=${encodeURIComponent(shop)}`;

  // Redirect till huvudplattformens connect-sida
  return redirect(connectUrl);
}
