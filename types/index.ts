export interface ConnectionRecord {
  tenant_id: string;
  source: "shopify";
  status: "connected" | "disconnected" | "error";
  access_token_enc: Buffer;
  meta: {
    shop: string;
    scope: string;
    store_domain: string;
    app_installed_at: string;
  };
}

export interface SyncJobLog {
  tenant_id: string;
  source: "shopify";
  status: "pending" | "running" | "succeeded" | "failed";
  started_at?: string;
  finished_at?: string;
  error?: string | null;
}
