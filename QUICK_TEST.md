# Snabbtest: Manual Sync

## Steg 1: Hämta nödvändig information

Du behöver tre saker:

### 1. Tenant ID
Hämta från Supabase `connections` tabellen:
```sql
SELECT tenant_id, meta->>'store_domain' as shop_domain
FROM connections
WHERE source = 'shopify' AND status = 'connected';
```

### 2. Shop Domain
Använd samma `store_domain` från query ovan (normaliserad, t.ex. `sandboxstorefront.myshopify.com`)

### 3. SYNC_SERVICE_KEY
Kolla i `.env` filen eller i huvudplattformens environment variables.

## Steg 2: Kör test-script

```bash
cd oj-analytics
./test-sync.sh
```

Scriptet kommer fråga efter:
- `tenant_id`
- `shop domain`

## Alternativ: Kör manuellt med curl

```bash
# Sätt variabler
TENANT_ID="din-tenant-id"
SHOP_DOMAIN="sandboxstorefront.myshopify.com"
SYNC_KEY="din-sync-service-key"
APP_URL="http://localhost:3000"  # eller din tunnel URL

# Kör sync
curl -X POST "${APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }"
```

## Steg 3: Verifiera resultat

Kontrollera i Supabase:

```sql
-- Kontrollera ordrar
SELECT COUNT(*) as order_count
FROM shopify_orders
WHERE tenant_id = 'din-tenant-id';

-- Kontrollera shop info
SELECT domain, name, currency
FROM shopify_shops
WHERE tenant_id = 'din-tenant-id';

-- Kontrollera KPIs
SELECT date, revenue, conversions, aov
FROM kpi_daily
WHERE tenant_id = 'din-tenant-id' AND source = 'shopify'
ORDER BY date DESC
LIMIT 5;

-- Kontrollera job log
SELECT status, error, created_at
FROM jobs_log
WHERE tenant_id = 'din-tenant-id' AND source = 'shopify'
ORDER BY created_at DESC
LIMIT 1;
```

## Förväntat resultat

✅ **Framgång:**
```json
{
  "synced": 5,
  "message": "Successfully synced 5 orders"
}
```

❌ **Fel:**
- `401 Unauthorized` → SYNC_SERVICE_KEY är fel
- `No connected Shopify account found` → tenant_id matchar inte
- `Shop domain mismatch` → shopDomain matchar inte connection
- `Shopify API error 401` → Access token är ogiltig

