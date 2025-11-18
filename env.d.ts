/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

interface ImportMetaEnv {
  readonly SHOPIFY_API_KEY: string;
  readonly SHOPIFY_API_SECRET: string;
  readonly SHOPIFY_APP_URL: string;
  readonly SCOPES?: string;
  readonly SHOPIFY_APP_HANDLE?: string;
  readonly DATABASE_URL?: string;
  readonly ANALYTICS_API_URL?: string;
  readonly ANALYTICS_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
