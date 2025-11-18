import "dotenv/config";

/**
 * Script to verify that webhooks are registered and live in Shopify
 * 
 * This script checks:
 * 1. That webhook endpoints are accessible
 * 2. That webhooks are registered in Shopify (requires manual check in Partner Dashboard)
 */

const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL || "https://oj-analytics-shopify-app-ebpu.vercel.app";
const EXPECTED_WEBHOOKS = [
  { topic: "app/scopes_update", uri: "/webhooks/app/scopes_update" },
  { topic: "app/uninstalled", uri: "/webhooks/app/uninstalled" },
  { topic: "orders/create", uri: "/webhooks/shopify" },
  { topic: "orders/updated", uri: "/webhooks/shopify" },
];

async function checkEndpoint(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: true }),
    });
    
    return {
      ok: response.ok || response.status === 401 || response.status === 400, // 401/400 means endpoint exists
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyWebhooks() {
  console.log("🔍 Verifying webhook configuration...\n");
  
  console.log(`📡 Shopify App URL: ${SHOPIFY_APP_URL}\n`);
  
  console.log("✅ Expected webhooks (from shopify.app.toml):");
  EXPECTED_WEBHOOKS.forEach((wh) => {
    console.log(`   - ${wh.topic} → ${SHOPIFY_APP_URL}${wh.uri}`);
  });
  
  console.log("\n🔗 Checking webhook endpoints accessibility...");
  
  const results = await Promise.all(
    EXPECTED_WEBHOOKS.map(async (wh) => {
      const fullUrl = `${SHOPIFY_APP_URL}${wh.uri}`;
      const result = await checkEndpoint(fullUrl);
      return { ...wh, fullUrl, ...result };
    })
  );
  
  let allEndpointsOk = true;
  results.forEach((result) => {
    if (result.ok) {
      console.log(`   ✅ ${result.topic} - Endpoint accessible (status: ${result.status})`);
    } else {
      console.log(`   ❌ ${result.topic} - Endpoint NOT accessible: ${result.error || `Status: ${result.status}`}`);
      allEndpointsOk = false;
    }
  });
  
  console.log("\n📋 Manual verification required:");
  console.log("   1. Go to Shopify Partner Dashboard → Your App → Event subscriptions");
  console.log("   2. Verify that webhooks are registered with these URLs:");
  EXPECTED_WEBHOOKS.forEach((wh) => {
    console.log(`      - ${wh.topic}: ${SHOPIFY_APP_URL}${wh.uri}`);
  });
  
  console.log("\n🧪 To test webhooks:");
  console.log("   1. Create a test order in your Shopify store");
  console.log("   2. Check Vercel logs for '[webhook] Received webhook'");
  console.log("   3. Check Supabase jobs_log for entries with source = 'shopify_webhook'");
  
  console.log("\n" + "=".repeat(60));
  if (allEndpointsOk) {
    console.log("✅ All webhook endpoints are accessible!");
    console.log("⚠️  Remember to verify registration in Partner Dashboard manually");
  } else {
    console.log("❌ Some webhook endpoints are not accessible");
    console.log("   Check Vercel deployment and SHOPIFY_APP_URL configuration");
  }
  console.log("=".repeat(60));
}

verifyWebhooks().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});

