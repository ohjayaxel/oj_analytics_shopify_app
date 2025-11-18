import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? "SET" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "MISSING",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? "SET" : "MISSING",
      ENCRYPTION_KEY_LENGTH: process.env.ENCRYPTION_KEY?.length || 0,
      ENCRYPTION_KEY_PREVIEW: process.env.ENCRYPTION_KEY?.substring(0, 20) + "..." || "N/A",
    },
    timestamp: new Date().toISOString(),
  });
};
