# Implementation Status

## ✅ Implementerat enligt guide

### 1. Tenant-val UI (`/app/connect`)
- ✅ Skapad `app/routes/app.connect.tsx`
- ✅ Hämtar tenants från huvudplattformens API (`/api/shopify/tenants`)
- ✅ Visar dropdown för tenant-val
- ✅ Initierar OAuth via huvudplattformens API (`/api/shopify/oauth/init`)
- ✅ Hanterar authentication redirect
- ✅ Auto-select om bara en tenant finns

### 2. Webhooks (`/webhooks/shopify`)
- ✅ Implementerad i `app/routes/webhooks.shopify.ts`
- ✅ HMAC-verifiering
- ✅ Tenant lookup via shop domain
- ✅ Normaliserad shop domain matching
- ✅ Order processing och KPI-omräkning

### 3. Manual Sync API (`/app/api/sync`)
- ✅ Implementerad i `app/routes/app.api.sync.ts`
- ✅ SYNC_SERVICE_KEY autentisering
- ✅ Shop domain validation
- ✅ Pagination för orders
- ✅ Job logging

### 4. Status-sida (`/app`)
- ✅ Visar connection status
- ✅ Redirectar till `/app/connect` om ingen connection finns
- ✅ Visar senaste sync-status

## ⚠️ OAuth Callback - Två implementationer

**Viktigt:** Det finns två OAuth callback-implementationer:

### Implementation 1: OAuth callback i Shopify-appen (Nuvarande)
- `app/routes/app.auth.oauth.callback.ts`
- `app/routes/auth.$.tsx`
- **Används om:** Huvudplattformen initierar OAuth med state-parameter

### Implementation 2: OAuth callback i huvudplattformen (Enligt guide)
- **Saknas:** Huvudplattformen behöver implementera `/api/oauth/shopify/callback`
- **Används om:** Tenant-val UI (`/app/connect`) används

## 📋 Vad huvudplattformen behöver implementera

### För Arkitektur B (enligt guide):

1. **`GET /api/shopify/tenants`**
   - Returnerar tillgängliga tenants för användaren
   - Kräver authentication (session cookies)
   - Response:
     ```json
     {
       "tenants": [
         {
           "id": "tenant-123",
           "name": "My Store",
           "slug": "my-store",
           "isConnected": false,
           "connectedShopDomain": null
         }
       ],
       "user": {
         "id": "user-123",
         "email": "user@example.com",
         "role": "admin",
         "isPlatformAdmin": false
       }
     }
     ```

2. **`POST /api/shopify/oauth/init`**
   - Skapar OAuth URL med valt tenant
   - Kräver authentication
   - Request:
     ```json
     {
       "tenantId": "tenant-123",
       "shopDomain": "store.myshopify.com"
     }
     ```
   - Response:
     ```json
     {
       "url": "https://store.myshopify.com/admin/oauth/authorize?..."
     }
     ```

3. **`GET /api/oauth/shopify/callback`**
   - Hanterar OAuth callback från Shopify
   - Validerar state, växlar code mot token
   - Sparar connection i Supabase
   - Redirectar tillbaka till integrations-sidan

### För Arkitektur A (nuvarande):

1. **Signerad state-parameter** (se `OAUTH_STATE_IMPLEMENTATION.md`)
   - Skapa state med `tenantId`, `shopDomain`, `timestamp`, `nonce`
   - Signera med HMAC-SHA256
   - Initiera OAuth med state-parameter

## 🔄 Hybrid-approach (Rekommenderat)

Du kan använda båda arkitekturerna:

- **Första gången:** Använd `/app/connect` för visuell tenant-val
- **Re-connection:** Använd direkt OAuth från huvudplattformen med state-parameter

I detta fall fungerar båda OAuth callback routes.

## 🚀 Nästa steg

1. **Om du vill använda Arkitektur B:**
   - Implementera API-endpoints i huvudplattformen (se ovan)
   - Testa `/app/connect` flow
   - OAuth callback routes i Shopify-appen används inte

2. **Om du vill använda Arkitektur A:**
   - Implementera signerad state i huvudplattformen
   - Testa OAuth flow med state-parameter
   - `/app/connect` kan användas som alternativ

3. **Om du vill använda Hybrid:**
   - Implementera båda
   - `/app/connect` för första gången
   - Direkt OAuth för re-connection

## 📝 Checklist

- [x] Tenant-val UI implementerad (`/app/connect`)
- [x] Webhooks implementerade (`/webhooks/shopify`)
- [x] Manual sync implementerad (`/app/api/sync`)
- [x] Status-sida med redirect till connect
- [x] OAuth callback i Shopify-appen (för Arkitektur A)
- [ ] API-endpoints i huvudplattformen (för Arkitektur B)
- [ ] Signerad state i huvudplattformen (för Arkitektur A)
- [ ] Testa fullständig OAuth flow
- [ ] Testa webhooks
- [ ] Testa manual sync

