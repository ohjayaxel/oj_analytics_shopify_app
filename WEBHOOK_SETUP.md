# Webhook Setup Guide

Denna guide förklarar hur du konfigurerar webhooks så att de går via Shopify-appen istället för direkt till huvudplattformen.

## Problem

Om webhooks går direkt till huvudplattformen (`https://ohjay-dashboard.vercel.app/api/webhooks/shopify`) istället för via Shopify-appen (`https://din-shopify-app.vercel.app/webhooks/shopify`), kommer:

- ❌ Shopify-appen inte få webhook-entries i `jobs_log`
- ❌ Webhook-statusen i Shopify-appen kommer visa "Unknown"
- ❌ Dataflödet blir inkonsekvent (webhooks går en väg, manuell sync går en annan)

## Lösning: Registrera Webhooks via Shopify-appen

### Steg 1: Verifiera Vercel URL

1. Gå till ditt Vercel Dashboard
2. Hitta din Shopify-app deployment
3. Kopiera Production URL (t.ex. `https://oj-analytics.vercel.app`)

### Steg 2: Uppdatera Webhook URL i Shopify Partner Dashboard

1. Gå till [Shopify Partner Dashboard](https://partners.shopify.com)
2. Välj din app "OJ Analytics"
3. Gå till **"Event subscriptions"** (eller **"Webhooks"**)
4. Hitta webhooks för `orders/create` och `orders/updated`
5. Uppdatera webhook-URL:en till:
   ```
   https://din-vercel-app.vercel.app/webhooks/shopify
   ```
   (Ersätt `din-vercel-app` med din faktiska Vercel-app URL)

### Steg 3: Alternativt - Registrera via Shopify CLI

Om du vill registrera webhooks automatiskt via `shopify.app.toml`:

```bash
cd oj-analytics
shopify app deploy
```

Detta kommer registrera webhooks enligt konfigurationen i `shopify.app.toml`:
- `orders/create` → `/webhooks/shopify`
- `orders/updated` → `/webhooks/shopify`

**OBS:** `shopify app deploy` kräver att appen redan är deployad till Vercel och att `SHOPIFY_APP_URL` är korrekt konfigurerad.

### Steg 4: Verifiera Webhook-registrering

1. Gå tillbaka till Shopify Partner Dashboard → Event subscriptions
2. Verifiera att webhook-URL:erna nu pekar på din Vercel-app:
   - ✅ `https://din-vercel-app.vercel.app/webhooks/shopify`
   - ❌ INTE `https://ohjay-dashboard.vercel.app/api/webhooks/shopify`

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

## Ytterligare Information

- Webhook-handlern finns i: `app/routes/webhooks.shopify.ts`
- Webhook-konfiguration finns i: `shopify.app.toml`
- Webhooks registreras automatiskt vid `shopify app deploy` om `include_config_on_deploy = true`

