# Deploy Shopify App till Vercel

## Steg 1: Förbered projektet

### 1.1 Skapa `vercel.json`

Skapa en `vercel.json` fil i root:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "remix",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 1.2 Uppdatera `package.json` scripts (om nödvändigt)

Kontrollera att `start` scriptet finns:
```json
{
  "scripts": {
    "start": "remix-serve ./build/server/index.js"
  }
}
```

## Steg 2: Deploy till Vercel

### 2.1 Via Vercel CLI

```bash
# Installera Vercel CLI (om du inte redan har det)
npm i -g vercel

# Logga in
vercel login

# Deploy
cd oj-analytics
vercel

# Följ instruktionerna:
# - Link to existing project? Nej (skapa nytt)
# - Project name: oj-analytics-shopify (eller valfritt namn)
# - Directory: ./
# - Override settings? Nej
```

### 2.2 Via Vercel Dashboard

1. Gå till: https://vercel.com/new
2. Importera projektet från GitHub (eller pusha till GitHub först)
3. Välj projektet: `oj-analytics`
4. Vercel kommer automatiskt detektera Remix
5. Klicka "Deploy"

## Steg 3: Sätt Environment Variables i Vercel

I Vercel Dashboard → Project → Settings → Environment Variables, lägg till:

```
SHOPIFY_API_KEY=din-api-key
SHOPIFY_API_SECRET=din-api-secret
SCOPES=read_orders
SHOPIFY_APP_URL=https://din-app.vercel.app
DATABASE_URL=din-database-url
SUPABASE_URL=din-supabase-url
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
ENCRYPTION_KEY=din-encryption-key
SYNC_SERVICE_KEY=din-sync-service-key
APP_BASE_URL=https://ohjay-dashboard.vercel.app
NEXT_PUBLIC_BASE_URL=https://ohjay-dashboard.vercel.app
NEXT_PUBLIC_ANALYTICS_URL=https://ohjay-dashboard.vercel.app
```

**Viktigt:** Sätt samma värden för Production, Preview, och Development.

## Steg 4: Uppdatera Shopify Partner Dashboard

1. Gå till: https://partners.shopify.com
2. Välj din app: **OJ Analytics**
3. Gå till: **App setup** → **App URL**
4. Uppdatera till din Vercel URL: `https://din-app.vercel.app`
5. Spara

## Steg 5: Uppdatera Redirect URLs

I Shopify Partner Dashboard → **App setup** → **Allowed redirection URLs**, kontrollera att:
- `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback` finns

## Steg 6: Testa

1. **Testa OAuth:**
   - Gå till huvudplattformen
   - Koppla en Shopify-butik
   - Verifiera att OAuth-flödet fungerar

2. **Testa Manual Sync:**
   ```bash
   curl -X POST https://din-app.vercel.app/app/api/sync \
     -H "Authorization: Bearer DIN_SYNC_SERVICE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "din-tenant-id",
       "shopDomain": "din-butik.myshopify.com"
     }'
   ```

3. **Testa Webhooks:**
   - Skapa en testorder i Shopify
   - Kontrollera att webhook anropas (kolla Vercel logs)
   - Verifiera att data synkas till Supabase

## Steg 7: Production Checklist

- [ ] Appen är deployad till Vercel
- [ ] Alla environment variables är satta
- [ ] Shopify App URL är uppdaterad till Vercel URL
- [ ] Redirect URLs är korrekta
- [ ] OAuth fungerar
- [ ] Manual sync fungerar
- [ ] Webhooks fungerar (om aktiverade)

## Troubleshooting

### Build fails
- Kontrollera att alla dependencies är installerade
- Kolla Vercel build logs för detaljerade fel

### Environment variables saknas
- Verifiera att alla variabler är satta i Vercel Dashboard
- Kontrollera att de är satta för rätt environment (Production/Preview/Development)

### App URL fungerar inte
- Verifiera att `SHOPIFY_APP_URL` i Vercel matchar din faktiska Vercel URL
- Kontrollera att appen är deployad och körs

### Webhooks fungerar inte
- Verifiera att webhook URL är tillgänglig från internet
- Kontrollera HMAC-verifiering (kolla `SHOPIFY_API_SECRET`)
- Kolla Vercel logs för webhook-anrop

