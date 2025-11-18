/* eslint-disable jest/no-deprecated-functions */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../../lib/supabase";
import { encryptSecret, decryptSecret } from "../../lib/encryption";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: Encryption/Decryption (test this first as it's faster)
  try {
    const testPlain = "test-token-12345";
    const encrypted = encryptSecret(testPlain);
    const decrypted = decryptSecret(encrypted);
    
    results.tests = {
      ...results.tests,
      encryption: {
        success: decrypted === testPlain,
        plainLength: testPlain.length,
        encryptedLength: encrypted.length,
        canDecrypt: decrypted === testPlain,
      },
    };
  } catch (error) {
    results.tests = {
      ...results.tests,
      encryption: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    // Return early if encryption fails - it's critical
    return json(results, { status: 500 });
  }

  // Test 2: Supabase connection (read) with timeout
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout (10s)")), 10000),
    );
    
    const queryPromise = supabase
      .from("connections")
      .select("tenant_id, source, status")
      .limit(5);
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<ReturnType<typeof queryPromise>>;
    
    results.tests = {
      ...results.tests,
      supabase_read: {
        success: !error,
        error: error?.message || null,
        rowCount: data?.length || 0,
        sample: data?.[0] || null,
      },
    };
  } catch (error) {
    results.tests = {
      ...results.tests,
      supabase_read: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error,
      },
    };
  }

  // Test 3: Supabase write (if tenantId provided)
  if (tenantId) {
    try {
      const testConnection = {
        tenant_id: tenantId,
        source: "shopify",
        status: "connected" as const,
        access_token_enc: encryptSecret("test-access-token"),
        meta: {
          shop: "test-shop.myshopify.com",
          scope: "read_orders",
          store_domain: "test-shop.myshopify.com",
          app_installed_at: new Date().toISOString(),
        },
      };

      // Try to upsert a test connection with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase write timeout (10s)")), 10000),
      );
      
      const queryPromise = supabase
        .from("connections")
        .upsert(testConnection, { onConflict: "tenant_id,source" })
        .select()
        .single();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<ReturnType<typeof queryPromise>>;

      results.tests = {
        ...results.tests,
        supabase_write: {
          success: !error,
          error: error?.message || null,
          written: data ? true : false,
        },
      };

      // Clean up: delete test connection
      if (data) {
        await supabase
          .from("connections")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("source", "shopify");
      }
    } catch (error) {
      results.tests = {
        ...results.tests,
        supabase_write: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }

    // Test 4: Read specific tenant connection
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Supabase read tenant timeout (10s)")), 10000),
      );
      
      const queryPromise = supabase
        .from("connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("source", "shopify")
        .maybeSingle();
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as Awaited<ReturnType<typeof queryPromise>>;

      results.tests = {
        ...results.tests,
        supabase_read_tenant: {
          success: !error,
          error: error?.message || null,
          found: !!data,
          connection: data
            ? {
                tenant_id: data.tenant_id,
                source: data.source,
                status: data.status,
                meta: data.meta,
                // Don't expose encrypted token
                has_token: !!data.access_token_enc,
              }
            : null,
        },
      };
    } catch (error) {
      results.tests = {
        ...results.tests,
        supabase_read_tenant: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  const allTestsPassed = Object.values(results.tests).every(
    (test) => test.success === true,
  );

  return json(results, {
    status: allTestsPassed ? 200 : 500,
  });
};
