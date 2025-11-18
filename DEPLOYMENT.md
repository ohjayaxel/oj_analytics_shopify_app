# Deployment & Testing Checklist

## ✅ Vad som är klart

### Implementation
- ✅ OAuth callback med state-parameter hantering
- ✅ Token encryption/decryption (AES-GCM, stöd för hex/base64 keys)
- ✅ Supabase integration (connections, shopify_orders, shopify_shops, kpi_daily, jobs_log)
- ✅ Manual sync endpoint (`POST /app/api/sync`) med pagination
- ✅ Webhooks för `orders/create` och `orders/updated`
- ✅ HMAC-verifiering för webhooks
- ✅ KPI-omräkning vid order-ändringar
- ✅ Job logging till Supabase
- ✅ Scopes minimerade till endast `read_orders` (inga write-scopes)

### Konfiguration
- ✅ `shopify.app.toml` konfigurerad med webhooks och scopes
- ✅ Environment variables dokumenterade i README
- ✅ Redirect URL konfigurerad för huvudplattformen

## 📋 Nästa steg för deployment

### 1. Environment Variables Setup
Kontrollera att alla miljövariabler är satta i `.env` och via `shopify app env`:

```bash
# Shopify credentials
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=...  # Sätts automatiskt av Shopify CLI
SCOPES=read_orders

# Supabase
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Encryption (hex format, samma som huvudplattformen)
ENCRYPTION_KEY=f1a2c3d4e5f60718293a4b5c6d7e8f90abcdeffedcba0987654321fedcba0123

# Sync service key (för POST /app/api/sync)
SYNC_SERVICE_KEY=...

# App URLs
APP_BASE_URL=https://ohjay-dashboard.vercel.app
NEXT_PUBLIC_BASE_URL=https://ohjay-dashboard.vercel.app
```

### 2. Shopify App Settings
I Shopify Partners Dashboard:

1. **App URL:** Sätt till din deployed app URL (eller tunnel URL för dev)
2. **Allowed redirection URLs:** Lägg till:
   - `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
   - Din app's callback URL (t.ex. `https://your-app.com/app/auth/oauth/callback`)

### 3. Test OAuth Flow
1. Från huvudplattformen, initiera OAuth med state-parameter:
   ```javascript
   const state = Buffer.from(JSON.stringify({ tenantId: "your-tenant-id" })).toString("base64");
   const oauthUrl = `https://${shopDomain}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=read_orders&redirect_uri=${CALLBACK_URL}&state=${state}`;
   ```
2. Efter OAuth, kontrollera att connection sparas i Supabase `connections` tabellen
3. Verifiera att `access_token_enc` är korrekt krypterad

### 4. Test Manual Sync
```bash
curl -X POST https://your-app.com/app/api/sync \
  -H "Authorization: Bearer YOUR_SYNC_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your-tenant-id",
    "shopDomain": "your-shop.myshopify.com"
  }'
```

Kontrollera:
- Orders synkas till `shopify_orders`
- Shop info synkas till `shopify_shops`
- KPIs beräknas och synkas till `kpi_daily`
- Job log skapas i `jobs_log` med status "succeeded"

### 5. Aktivera Webhooks (kräver godkännande)
**Viktigt:** `orders/create` och `orders/updated` webhooks kräver godkännande för "protected customer data" från Shopify.

**För development:**
- Webhooks är kommenterade ut i `shopify.app.toml` tills appen är godkänd
- Använd manual sync (`POST /app/api/sync`) istället för att testa data-synkning

**För production:**
1. Ansök om godkännande: https://shopify.dev/docs/apps/launch/protected-customer-data
2. Efter godkännande, uncomment webhooks i `shopify.app.toml`:
   ```toml
   [[webhooks.subscriptions]]
   topics = [ "orders/create", "orders/updated" ]
   uri = "/webhooks/shopify"
   ```
3. Deploy och testa:
   - Skapa en test-order i Shopify
   - Kontrollera att webhook anropas (kolla logs)
   - Verifiera att order synkas till `shopify_orders`
   - Kontrollera att KPIs omräknas korrekt

### 6. Deployment
```bash
# Deploy till din hosting (t.ex. Vercel, Railway, etc.)
npm run build
# Följ din hosting-providers deployment instructions

# Efter deployment, uppdatera Shopify App Settings med production URL
```

### 7. Production Checklist
- [ ] Alla environment variables satta i production
- [ ] Shopify App URL uppdaterad till production URL
- [ ] Redirect URLs uppdaterade i Shopify Partners Dashboard
- [ ] Webhooks verifierade i Shopify Admin (Webhooks section)
- [ ] Test OAuth flow i production
- [ ] Test manual sync i production
- [ ] Test webhooks i production (skapa en test-order)
- [ ] Monitoring/logging på plats för felhantering

## 🔍 Troubleshooting

### OAuth callback fungerar inte
- Kontrollera att `state`-parametern är korrekt base64-kodad JSON med `tenantId`
- Verifiera att redirect URL matchar i Shopify App Settings
- Kolla logs för felmeddelanden

### Sync fungerar inte
- Verifiera att `SYNC_SERVICE_KEY` är korrekt i Authorization header
- Kontrollera att connection finns i Supabase för tenantId
- Kolla att access token kan dekrypteras korrekt
- Verifiera Shopify API rate limits

### Webhooks fungerar inte
- **Protected customer data error:** Webhooks för `orders/create` och `orders/updated` kräver godkännande. Använd manual sync tills appen är godkänd.
- Kontrollera att webhooks är aktiverade i `shopify.app.toml` (uncomment efter godkännande)
- Verifiera HMAC-verifiering (kolla `SHOPIFY_API_SECRET`)
- Kolla att shop domain matchar i `connections.meta`
- Verifiera webhook URL är tillgänglig från internet (använd tunnel för dev)

### Supabase errors
- Kontrollera att `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` är korrekta
- Verifiera att service role key har rätt permissions
- Kolla Supabase logs för detaljerade felmeddelanden

## 📚 Ytterligare resurser

- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [Shopify Webhooks](https://shopify.dev/docs/apps/webhooks)
- [Supabase Documentation](https://supabase.com/docs)

