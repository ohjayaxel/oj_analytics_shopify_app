# Webhook Setup Guide

Denna guide förklarar hur webhooks registreras automatiskt via `shopify.app.toml` och `shopify app deploy`.

## Automatisk Webhook-registrering

Webhooks konfigureras i `shopify.app.toml` och registreras automatiskt när du kör `shopify app deploy`. **Ingen manuell konfiguration i Partner Dashboard behövs.**

## Konfiguration

Webhooks är redan konfigurerade i `shopify.app.toml`:

```toml
[build]
include_config_on_deploy = true  # Registrerar webhooks automatiskt vid deploy

[webhooks]
api_version = "2025-10"

  [[webhooks.subscriptions]]
  topics = [ "orders/create", "orders/updated" ]
  uri = "/webhooks/shopify"
```

## Steg för att registrera Webhooks

### Steg 1: Konfigurera SHOPIFY_APP_URL i Vercel

1. Gå till Vercel Dashboard → Din app → Settings → Environment Variables
2. Lägg till eller uppdatera `SHOPIFY_APP_URL` med din Vercel Production URL:
   ```
   SHOPIFY_APP_URL=https://din-app.vercel.app
   ```
   (Ersätt `din-app` med din faktiska Vercel-app URL)

### Steg 2: Deploya appen till Vercel

Appen måste vara deployad till Vercel innan webhooks kan registreras. Om du använder GitHub integration, sker deployment automatiskt vid push.

### Steg 3: Registrera Webhooks via Shopify CLI

Kör följande kommando för att registrera webhooks automatiskt:

```bash
cd oj-analytics
shopify app deploy
```

Detta kommer:
- ✅ Läsa webhook-konfigurationen från `shopify.app.toml`
- ✅ Registrera webhooks i Shopify med korrekt URL (`SHOPIFY_APP_URL/webhooks/shopify`)
- ✅ Uppdatera befintliga webhooks om de redan finns

**OBS:** `shopify app deploy` använder `SHOPIFY_APP_URL` från environment variables för att bygga webhook-URL:erna.

### Steg 4: Verifiera Webhook-registrering

Efter `shopify app deploy` kan du verifiera att webhooks är registrerade:

1. Gå till [Shopify Partner Dashboard](https://partners.shopify.com) → Din app → Event subscriptions
2. Verifiera att webhook-URL:erna pekar på din Vercel-app:
   - ✅ `https://din-vercel-app.vercel.app/webhooks/shopify`
   - ❌ INTE `https://ohjay-dashboard.vercel.app/api/webhooks/shopify`

**OBS:** Om webhooks redan var registrerade med fel URL, kommer `shopify app deploy` att uppdatera dem automatiskt.

### Steg 5: Testa Webhooks

1. Skapa en test-order i din Shopify-butik
2. Kontrollera Vercel-loggarna för din Shopify-app:
   - Sök efter `[webhook] Received webhook`
   - Sök efter `[webhook] Processed successfully`
3. Kontrollera Supabase `jobs_log`:
   ```sql
   SELECT * FROM jobs_log 
   WHERE source = 'shopify_webhook' 
   ORDER BY started_at DESC 
   LIMIT 5;
   ```
4. Kontrollera Shopify-appen:
   - Webhook-statusen ska nu visa "Webhooks Active" istället för "Unknown"

## Verifiera att Webhooks Fungerar

### I Vercel Logs

Du ska se loggar som:
```
[webhook] Received webhook { shop: 'skinome-project.myshopify.com', topic: 'orders/create', ... }
[webhook] Processed successfully: orders/create for order 7021935001943
```

### I Supabase

Du ska se nya rader i `jobs_log`:
```sql
SELECT 
  tenant_id,
  source,
  status,
  started_at,
  finished_at
FROM jobs_log
WHERE source = 'shopify_webhook'
ORDER BY started_at DESC;
```

### I Shopify-appen

- Webhook-statusen ska visa "Webhooks Active" (grön badge)
- "Last webhook event" ska visa en tidsstämpel

## Felsökning

### Webhooks går fortfarande till huvudplattformen

1. **Kontrollera Partner Dashboard:** Se till att webhook-URL:erna är uppdaterade
2. **Kontrollera Vercel URL:** Verifiera att din Vercel-app är nåbar
3. **Testa endpointen manuellt:** Skicka en test-förfrågning till `/webhooks/shopify`

### Webhooks levereras men misslyckas

1. **Kontrollera Vercel-loggarna** för felmeddelanden
2. **Kontrollera HMAC-verifiering:** Se till att `SHOPIFY_API_SECRET` är korrekt
3. **Kontrollera tenant-mapping:** Se till att shop domain matchar i `connections`-tabellen

### Inga webhooks levereras alls

1. **Kontrollera att webhooks är registrerade** i Partner Dashboard
2. **Kontrollera att appen är installerad** i Shopify-butiken
3. **Testa genom att skapa en ny order** i Shopify-butiken

## Arkitektur

Efter korrekt konfiguration:

```
Shopify Store
    ↓ (webhook)
Shopify App (Vercel)
    ↓ (process & save)
Supabase (shopify_orders, kpi_daily, jobs_log)
    ↓ (read)
Huvudplattform (ohjay-dashboard.vercel.app)
```

Istället för (fel):

```
Shopify Store
    ↓ (webhook)
Huvudplattform (ohjay-dashboard.vercel.app)
    ↓ (process & save)
Supabase
```

## Sammanfattning

✅ **Webhooks konfigureras i kod** (`shopify.app.toml`)  
✅ **Webhooks registreras automatiskt** via `shopify app deploy`  
✅ **Ingen manuell konfiguration** i Partner Dashboard behövs  
✅ **Webhooks uppdateras automatiskt** om de redan finns med fel URL

## Krav

1. ✅ `SHOPIFY_APP_URL` måste vara korrekt konfigurerad i Vercel environment variables
2. ✅ Appen måste vara deployad till Vercel
3. ✅ `shopify app deploy` måste köras för att registrera webhooks

## Ytterligare Information

- Webhook-handlern finns i: `app/routes/webhooks.shopify.ts`
- Webhook-konfiguration finns i: `shopify.app.toml` (rad 12-28)
- Webhooks registreras automatiskt vid `shopify app deploy` om `include_config_on_deploy = true` (rad 10)

