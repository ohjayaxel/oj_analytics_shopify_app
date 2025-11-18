# Nästa steg - Shopify App

## ✅ Status

### Implementerat
- ✅ Connect route (`/app/connect`) - Enkel redirect till huvudplattformens `/connect/shopify`
- ✅ Webhooks (`/webhooks/shopify`)
- ✅ Manual Sync API (`/app/api/sync`)
- ✅ Status-sida med redirect till connect
- ✅ OAuth callback-routes kommenterade ut (hanteras i huvudplattformen)

### Konfiguration
- ✅ Redirect URI i `shopify.app.toml` pekar på huvudplattformens callback
- ✅ Scopes minimerade till `read_orders`
- ✅ Webhooks kommenterade ut (kräver godkännande)

## 📋 Checklist

### 1. Verifiera Redirect URI i Shopify Partner Dashboard
- [ ] Logga in på Shopify Partner Dashboard
- [ ] Välj app "OJ Analytics"
- [ ] Gå till **App setup** → **URLs**
- [ ] Verifiera att **Allowed redirection URL(s)** är:
  ```
  https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
  ```

### 2. Testa Connect Redirect
- [ ] Öppna Shopify-appen i en butik
- [ ] Navigera till `/app/connect?shop=store.myshopify.com`
- [ ] Verifiera redirect till huvudplattformens `/connect/shopify?shop=store.myshopify.com`
- [ ] Kontrollera att shop parameter skickas korrekt

### 3. Testa OAuth Flow (i huvudplattformen)
- [ ] Öppna huvudplattformens `/connect/shopify` sida
- [ ] Logga in om nödvändigt
- [ ] Välj tenant i dropdown
- [ ] Klicka "Connect"
- [ ] Verifiera redirect till Shopify OAuth
- [ ] Efter auktorisering: Verifiera redirect till huvudplattformens callback
- [ ] Kontrollera att connection sparas i Supabase

### 4. Verifiera Connection i Supabase
- [ ] Öppna Supabase Dashboard
- [ ] Gå till `connections` tabellen
- [ ] Verifiera att ny rad skapas med:
  - `source = 'shopify'`
  - `status = 'connected'`
  - `meta->>'store_domain'` matchar shop domain
  - `access_token_enc` är ifylld (krypterad)

### 5. Testa Status-sida
- [ ] Öppna `/app` i Shopify-appen
- [ ] Verifiera att status visar "Active" (grön badge)
- [ ] Kontrollera att senaste sync-status visas

### 6. Testa Manual Sync (valfritt)
```bash
curl -X POST https://your-shopify-app.com/app/api/sync \
  -H "Authorization: Bearer YOUR_SYNC_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "shopDomain": "store.myshopify.com"
  }'
```

## 🔧 Konfiguration

### Environment Variables

Se till att följande är satta:

```bash
# Analytics Platform URL (för tenant-val UI)
NEXT_PUBLIC_ANALYTICS_URL=https://ohjay-dashboard.vercel.app

# Supabase
SUPABASE_URL=https://punicovacaktaszqcckp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Shopify
SHOPIFY_API_KEY=<app_client_id>
SHOPIFY_API_SECRET=<app_client_secret>
SCOPES=read_orders

# Encryption (måste matcha huvudplattformen)
ENCRYPTION_KEY=<encryption_key>

# Sync Service Key
SYNC_SERVICE_KEY=<sync_service_key>

# App URLs
APP_BASE_URL=https://ohjay-dashboard.vercel.app
NEXT_PUBLIC_BASE_URL=https://ohjay-dashboard.vercel.app
```

## 🐛 Troubleshooting

### Problem: Connect redirect fungerar inte

**Lösning:**
- Verifiera att `NEXT_PUBLIC_ANALYTICS_URL` är satt korrekt
- Kontrollera att shop parameter skickas med i URL
- Verifiera att huvudplattformens `/connect/shopify` route finns

### Problem: OAuth callback går till fel URL

**Lösning:**
- Verifiera Redirect URI i Shopify Partner Dashboard
- Kontrollera att `redirect_uri` i OAuth-initiering matchar

### Problem: Connection sparas inte i Supabase

**Lösning:**
- Kontrollera att huvudplattformens callback (`/api/oauth/shopify/callback`) fungerar
- Verifiera Supabase credentials
- Kolla Supabase logs för fel

### Problem: Status-sidan visar "Disconnected"

**Lösning:**
- Kontrollera att connection finns i Supabase
- Verifiera att `meta->>'store_domain'` matchar shop domain exakt (normaliserad)
- Kolla console logs för debugging

## 📚 Relaterade dokument

- `ARCHITECTURE.md` - Förklarar de två arkitekturerna
- `IMPLEMENTATION_STATUS.md` - Detaljerad status
- `OAUTH_STATE_IMPLEMENTATION.md` - Guide för signerad state (om Arkitektur A används)
- `DEPLOYMENT.md` - Deployment-checklista

## ✅ När allt fungerar

1. **OAuth Flow:**
   - Användare öppnar Shopify-appen → `/app/connect`
   - Väljer tenant → Klickar "Connect"
   - Shopify OAuth → Huvudplattformens callback
   - Connection sparas i Supabase
   - Redirect till integrations-sidan

2. **Status:**
   - `/app` visar "Active" badge
   - Senaste sync-status visas

3. **Data-synkning:**
   - Manual sync fungerar via `/app/api/sync`
   - Webhooks fungerar (efter godkännande)

## 🎯 Rekommendation

**Använd bara Arkitektur B (tenant-val UI)** för enklare underhåll:
- En enda OAuth-flow
- Visuell tenant-val
- All OAuth-logik i huvudplattformen

Om du behöver stödja båda arkitekturerna, uncomment OAuth callback-routes i Shopify-appen.

