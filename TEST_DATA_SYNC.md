# Testguide: Verifiera Data Sync till Supabase

Denna guide hjälper dig att testa och verifiera att data faktiskt kommer in i Supabase från Shopify med nuvarande scope (`read_orders`).

## Förutsättningar

1. ✅ OAuth-koppling är klar (appen är installerad i Shopify)
2. ✅ Connection finns i Supabase `connections` tabellen
3. ✅ Environment variables är korrekt satta (se `.env.example`)
4. ✅ Shopify appen körs (`shopify app dev`)

## Steg 1: Verifiera Connection i Supabase

Kontrollera att connection finns och är korrekt:

```sql
-- I Supabase SQL Editor
SELECT 
  tenant_id,
  source,
  status,
  meta->>'store_domain' as shop_domain,
  created_at,
  updated_at
FROM connections
WHERE source = 'shopify'
  AND status = 'connected';
```

**Förväntat resultat:**
- Minst en rad med `status = 'connected'`
- `meta.store_domain` ska matcha din Shopify shop domain (normaliserad, t.ex. `sandboxstorefront.myshopify.com`)

## Steg 2: Testa Manual Sync

Manual sync hämtar alla ordrar från Shopify och synkar dem till Supabase.

### 2.1 Hämta nödvändig information

Du behöver:
- `tenant_id` från `connections` tabellen
- `shopDomain` (normaliserad, t.ex. `sandboxstorefront.myshopify.com`)
- `SYNC_SERVICE_KEY` från `.env`

### 2.2 Kör manual sync via curl

```bash
# Ersätt med dina värden
TENANT_ID="7047fb33-7d77-4ab7-bb86-e8057f10ff35"
SHOP_DOMAIN="sandboxstorefront.myshopify.com"
SYNC_KEY="din-sync-service-key"
SHOPIFY_APP_URL="https://permalink-frog-series-initially.trycloudflare.com"  # Din tunnel URL

curl -X POST "${SHOPIFY_APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }"
```

**Förväntat svar:**
```json
{
  "synced": 5,
  "message": "Successfully synced 5 orders"
}
```

### 2.3 Verifiera data i Supabase

Efter sync, kontrollera att data finns:

```sql
-- Kontrollera ordrar
SELECT 
  tenant_id,
  order_id,
  processed_at,
  total_price,
  currency,
  customer_id,
  is_refund,
  created_at
FROM shopify_orders
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'  -- Ersätt med ditt tenant_id
ORDER BY processed_at DESC
LIMIT 10;

-- Kontrollera shop info
SELECT 
  tenant_id,
  external_id,
  domain,
  name,
  currency,
  updated_at
FROM shopify_shops
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35';

-- Kontrollera KPIs
SELECT 
  tenant_id,
  date,
  source,
  revenue,
  conversions,
  aov,
  updated_at
FROM kpi_daily
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'
  AND source = 'shopify'
ORDER BY date DESC
LIMIT 10;

-- Kontrollera job log
SELECT 
  tenant_id,
  source,
  status,
  error,
  created_at
FROM jobs_log
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'
  AND source = 'shopify'
ORDER BY created_at DESC
LIMIT 5;
```

**Förväntat resultat:**
- `shopify_orders`: Minst en rad per order
- `shopify_shops`: En rad med shop information
- `kpi_daily`: Aggregerade KPIs per datum
- `jobs_log`: En rad med `status = 'succeeded'`

## Steg 3: Testa Webhooks

Webhooks triggas automatiskt när ordrar skapas eller uppdateras i Shopify.

### 3.1 Skapa en testorder i Shopify

1. Gå till din Shopify dev store admin
2. Skapa en ny testorder (Orders → Create order)
3. Fyll i kundinfo och produkter
4. Spara ordern

### 3.2 Verifiera webhook i Supabase

Efter några sekunder, kontrollera:

```sql
-- Kontrollera att ordern synkades via webhook
SELECT 
  order_id,
  processed_at,
  total_price,
  created_at,
  updated_at
FROM shopify_orders
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'
ORDER BY created_at DESC
LIMIT 1;

-- Kontrollera att KPI uppdaterades
SELECT 
  date,
  revenue,
  conversions,
  updated_at
FROM kpi_daily
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'
  AND source = 'shopify'
ORDER BY updated_at DESC
LIMIT 1;
```

### 3.3 Kontrollera webhook logs

Om webhook misslyckas, kolla `jobs_log`:

```sql
SELECT 
  status,
  error,
  created_at
FROM jobs_log
WHERE tenant_id = '7047fb33-7d77-4ab7-bb86-e8057f10ff35'
  AND source = 'shopify'
  AND status = 'failed'
ORDER BY created_at DESC;
```

## Steg 4: Felsökning

### Problem: "No connected Shopify account found"

**Orsak:** `tenant_id` matchar inte någon connection i Supabase.

**Lösning:**
1. Verifiera `tenant_id` i `connections` tabellen
2. Kontrollera att `status = 'connected'`
3. Använd exakt samma `tenant_id` i sync-requesten

### Problem: "Shop domain mismatch"

**Orsak:** `shopDomain` i requesten matchar inte `meta.store_domain` i connection.

**Lösning:**
1. Kontrollera `meta.store_domain` i `connections` tabellen
2. Använd exakt samma domain (normaliserad, t.ex. `sandboxstorefront.myshopify.com`)
3. Se till att domain är normaliserad (inga `https://`, `www.`, eller trailing slashes)

### Problem: "Unauthorized" (401)

**Orsak:** `SYNC_SERVICE_KEY` matchar inte.

**Lösning:**
1. Kontrollera att `SYNC_SERVICE_KEY` i `.env` matchar värdet i huvudplattformen
2. Verifiera att header är `Authorization: Bearer <key>` (med mellanslag efter "Bearer")

### Problem: "Shopify API error 401"

**Orsak:** Access token är ogiltig eller har gått ut.

**Lösning:**
1. Kontrollera att connection fortfarande är aktiv i Shopify
2. Om nödvändigt, gör om OAuth-kopplingen
3. Verifiera att token dekrypteras korrekt (kolla `lib/encryption.ts`)

### Problem: Inga ordrar synkas

**Orsak:** Butiken har inga ordrar eller scope saknas.

**Lösning:**
1. Verifiera att butiken faktiskt har ordrar i Shopify Admin
2. Kontrollera att `read_orders` scope är aktivt i `shopify.app.toml`
3. Testa att hämta ordrar direkt via Shopify API (se nedan)

### Problem: Webhooks fungerar inte

**Orsak:** Webhooks är inte aktiverade eller HMAC-verifiering misslyckas.

**Lösning:**
1. Kontrollera att webhooks är aktiverade i `shopify.app.toml`:
   ```toml
   [[webhooks.subscriptions]]
   topics = [ "orders/create", "orders/updated" ]
   uri = "/webhooks/shopify"
   ```
2. Verifiera att `SHOPIFY_API_SECRET` är korrekt satt
3. Kolla Shopify Partner Dashboard → App → Webhooks för att se om webhooks är registrerade

## Steg 5: Testa Shopify API direkt (valfritt)

För att verifiera att API-anrop fungerar, testa direkt:

```bash
# Hämta access token från Supabase (dekrypterad)
# Se lib/encryption.ts för hur man dekrypterar

SHOP_DOMAIN="sandboxstorefront.myshopify.com"
ACCESS_TOKEN="din-dekrypterade-token"

curl "https://${SHOP_DOMAIN}/admin/api/2025-10/orders.json?limit=5" \
  -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}" \
  -H "Accept: application/json"
```

**Förväntat svar:**
```json
{
  "orders": [
    {
      "id": 1234567890,
      "processed_at": "2024-01-15T10:30:00Z",
      "total_price": "99.99",
      "currency": "SEK",
      ...
    }
  ]
}
```

## Checklista

- [ ] Connection finns i Supabase med `status = 'connected'`
- [ ] Manual sync returnerar `synced: X` (X > 0)
- [ ] Data finns i `shopify_orders` tabellen
- [ ] Data finns i `shopify_shops` tabellen
- [ ] Data finns i `kpi_daily` tabellen
- [ ] Job log visar `status = 'succeeded'`
- [ ] Webhook triggas när ny order skapas
- [ ] Webhook uppdaterar `shopify_orders` och `kpi_daily`

## Nästa steg

När allt fungerar:
1. ✅ Data synkas korrekt till Supabase
2. ✅ Webhooks fungerar för nya/uppdaterade ordrar
3. ✅ KPIs beräknas korrekt

Då kan vi gå vidare med att lägga till nya scopes (t.ex. `read_customers`) för att hämta kunddata och implementera stöd för "ny vs återkommande kund".

