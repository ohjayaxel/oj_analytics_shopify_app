# Kör Manual Sync Test

## ✅ Förutsättningar
- [x] SYNC_SERVICE_KEY är satt i `.env` (lägg till värdet om det saknas)
- [x] Shopify appen körs (`shopify app dev`)
- [ ] Tenant ID och Shop Domain är hämtade från Supabase

## 📊 Steg 1: Hämta Connection Info från Supabase

1. Öppna Supabase Dashboard → SQL Editor
2. Kör query från `hämta-connection-info.sql`:
   ```sql
   SELECT 
     tenant_id,
     meta->>'store_domain' as shop_domain,
     status
   FROM connections
   WHERE source = 'shopify' AND status = 'connected';
   ```
3. Kopiera `tenant_id` och `shop_domain` från resultatet

## 🚀 Steg 2: Kör Testet

### Alternativ A: Använd test-script

```bash
cd oj-analytics
./test-sync.sh
```

När scriptet frågar:
- **tenant_id**: Klistra in från Supabase query
- **shop domain**: Klistra in från Supabase query (t.ex. `sandboxstorefront.myshopify.com`)

### Alternativ B: Kör manuellt med curl

```bash
# Sätt variabler (ersätt med dina värden)
TENANT_ID="din-tenant-id-från-supabase"
SHOP_DOMAIN="sandboxstorefront.myshopify.com"  # Från Supabase
SYNC_KEY="din-sync-service-key"                 # Från .env
APP_URL="http://localhost:3000"                  # Lokal URL

# Kör sync
curl -X POST "${APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }"
```

## ✅ Steg 3: Verifiera Resultat

**Framgång:**
```json
{
  "synced": 5,
  "message": "Successfully synced 5 orders"
}
```

**Kontrollera i Supabase:**
```sql
-- Kontrollera ordrar
SELECT COUNT(*) FROM shopify_orders WHERE tenant_id = 'din-tenant-id';

-- Kontrollera KPIs
SELECT date, revenue, conversions FROM kpi_daily 
WHERE tenant_id = 'din-tenant-id' AND source = 'shopify' 
ORDER BY date DESC LIMIT 5;
```

## 🐛 Vanliga Fel

- **401 Unauthorized** → SYNC_SERVICE_KEY matchar inte
- **No connected Shopify account found** → tenant_id är fel
- **Shop domain mismatch** → shop_domain matchar inte connection

