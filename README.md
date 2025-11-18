# OJ Analytics – Shopify ↔ Supabase Bridge

Den här appen är en ren integrationsbrygga mellan Shopify och vår befintliga analysplattform på Vercel/Supabase. Appen sköter endast OAuth-inställning, tokenlagring, datasynk och webhook-hantering – inga dashboards renderas i Shopify längre.

## Kom igång

```bash
cd oj-analytics
npm install
cp .env.example .env
npm run config:link   # länka mot rätt app + dev store
npm run dev           # starta Shopify CLI + tunnel
```

## Miljövariabler

| Variabel | Syfte |
| --- | --- |
| `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` | Appens Client ID/secret från Partner-portalen |
| `SHOPIFY_APP_URL`, `SHOPIFY_APP_HANDLE` | Hanteras av Shopify CLI (`dev` kommando) |
| `SCOPES` | Läsbehörigheter (endast read_*) |
| `APP_BASE_URL`, `NEXT_PUBLIC_BASE_URL` | URL till Vercel-plattformen som ska öppnas efter installation |
| `NEXT_PUBLIC_ANALYTICS_URL` | URL till huvudplattformen (för tenant-val UI, default: `APP_BASE_URL`) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Service-klient för att skriva till connections/orders/KPI-tabeller |
| `ENCRYPTION_KEY` | Hex eller Base64-kodad AES-nyckel (128/192/256 bitar) för att kryptera Shopify tokens |
| `SYNC_SERVICE_KEY` | Server-to-server nyckel som krävs för `POST /app/api/sync` |

> **Tips:** `ENCRYPTION_KEY` måste vara samma som används i huvudplattformen så att tokenkryptering/dekryptering matchar.

## Projektstruktur

```
lib/
  encryption.ts        # encryptSecret/decryptSecret via AES-GCM
  logger.ts            # loggar jobb till Supabase jobs_log
  shopify.ts           # REST-hjälpare för orders/shop-info
  supabase.ts          # service role-klient
  transformers.ts      # mappar Shopify orders → supabase tabeller
app/routes/
  app.connect.tsx             # tenant-val UI för att välja vilket konto som ska kopplas
  app.auth.oauth.callback.ts  # OAuth callback (används om OAuth initieras från huvudplattformen)
  auth.$.tsx                  # Alternativ OAuth callback route
  app.api.sync.ts             # manuell synk (kräver Bearer SYNC_SERVICE_KEY)
  webhooks.shopify.ts         # tar emot orders/create & orders/updated
  app._index.tsx              # status-sida som visar connection status
```

## OAuth-flöde

### Arkitektur A: OAuth callback i Shopify-appen

1. Huvudplattformen initierar OAuth mot Shopify med signerad `state`-parameter (se `OAUTH_STATE_IMPLEMENTATION.md`).
2. Shopify skickar tillbaka användaren till `/app/auth/oauth/callback` eller `/auth/*`.
3. Callback-route:
   - Validerar `state` med HMAC-signatur och timestamp.
   - Verifierar att shop domain matchar state.
   - Kontrollerar att shop inte redan är kopplad till annan tenant.
   - Krypterar token med `encryptSecret`.
   - Sparar/upsertar posten i Supabase `connections`.
   - Redirectar användaren tillbaka till `APP_BASE_URL` med status.

### Arkitektur B: OAuth callback i huvudplattformen (med tenant-val UI)

1. Användaren öppnar Shopify-appen → `/app/connect`.
2. Shopify-appen hämtar tillgängliga tenants från huvudplattformens API (`/api/shopify/tenants`).
3. Användaren väljer tenant och klickar "Connect".
4. Shopify-appen anropar huvudplattformens API (`/api/shopify/oauth/init`) för att få OAuth URL.
5. Shopify redirectar till OAuth URL.
6. Shopify redirectar tillbaka till huvudplattformens callback (`/api/oauth/shopify/callback`).
7. Huvudplattformen hanterar OAuth och sparar connection.

**Se `ARCHITECTURE.md` för mer information om de två arkitekturerna.**

## Datasynk

### Manuell trigger (`POST /app/api/sync`)

Body:
```json
{ "tenantId": "...", "shopDomain": "storename.myshopify.com" }
```
Header:
```
Authorization: Bearer <SYNC_SERVICE_KEY>
```

Synken:
1. Hämtar connection från Supabase och dekrypterar token.
2. Läser orderdata och shop-info via Shopify REST.
3. Transformerar data → `shopify_orders`, `shopify_shops` och `kpi_daily`.
4. Loggar resultatet i `jobs_log` (succeeded/failed).

### Webhooks (`/webhooks/shopify`)

Registrerade topics: `orders/create`, `orders/updated`. Endpointen verifierar HMAC, hittar tenant via `connections.meta.store_domain`, transformerar payloaden och uppdaterar samma tabeller + KPI för motsvarande datum. Fel loggas till `jobs_log` via `logJob`.

## Supabase-tabeller

- `connections` – lagrar krypterade tokens + metadata.
- `shopify_orders` – orderrader (tenant, order_id, processed_at, totals, refunds).
- `shopify_shops` – shopens namn, domän, valuta.
- `kpi_daily` – aggregerad revenue/conversions/AOV per dag. `spend`, `clicks`, `roas`, `cos` hålls `null` (Shopify levererar inte kampanjdata).
- `jobs_log` – loggposter per manuell synk/webhook-fel.

## Lokalt testflöde

1. Starta `shopify app dev` och installera appen i dev-butiken.
2. Initiera OAuth från huvudplattformen (eller manuellt genom att kalla installationslänken med `state`).
3. Kör en manuell synk:
   ```bash
   curl -X POST http://localhost:3000/app/api/sync \
     -H "Authorization: Bearer $SYNC_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"tenantId":"...","shopDomain":"sandboxstorefront.myshopify.com"}'
   ```
4. Trigga webhooks via Shopify Admin/CLI och verifiera att `shopify_orders` uppdateras.

## Deployment-checklista

- Uppdatera `shopify.app.toml` med riktiga `application_url` och OAuth-redirects innan `shopify app deploy`.
- Sätt alla env-variabler i hostingmiljön (Vercel/Fly/Cloudflare Workers).
- Skapa Supabase policies om ni inte använder service-role-nyckeln.
- Registrera webhooks genom `shopify app deploy` eller `shopify app webhook trigger` för test.

## Felsökning

- **403 från Shopify App Management:** säkerställ att rätt partnerkonto är inloggat innan `shopify app dev`.
- **`navigator is not defined`:** UI-komponenter är borttagna; se till att inga andra filer importerar browser-only paket på servern.
- **`Unauthorized` vid sync:** kontrollera att `Authorization` header matchar `SYNC_SERVICE_KEY`.
- **Webhooks utan tenant:** se till att `connections.meta.store_domain` matchar värdet i `X-Shopify-Shop-Domain` (små bokstäver).

Appen är nu en “plug-and-play”-koppling: Shopify används endast för att hämta data och skicka den vidare till befintlig analysplattform.
