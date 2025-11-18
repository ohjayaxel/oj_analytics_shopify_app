# Testguide: Steg för steg

## ✅ Status
- Shopify appen körs (`shopify app dev`)
- Remix server körs
- `.env` filen finns

## 🔧 Steg 1: Lägg till SYNC_SERVICE_KEY

Du behöver lägga till `SYNC_SERVICE_KEY` i `.env` filen. Detta är samma nyckel som används i huvudplattformen för att autentisera server-to-server requests.

```bash
# Öppna .env filen
cd oj-analytics
nano .env  # eller använd din favorit-editor
```

Lägg till:
```
SYNC_SERVICE_KEY=din-sync-service-key-här
```

**Var hittar jag SYNC_SERVICE_KEY?**
- I huvudplattformens environment variables (Vercel dashboard)
- Eller i huvudplattformens `.env` fil

## 📊 Steg 2: Hämta tenant_id och shopDomain från Supabase

### Alternativ A: Via Supabase Dashboard

1. Gå till Supabase Dashboard → SQL Editor
2. Kör denna query:

```sql
SELECT 
  tenant_id,
  meta->>'store_domain' as shop_domain,
  status,
  created_at
FROM connections
WHERE source = 'shopify' 
  AND status = 'connected'
ORDER BY created_at DESC;
```

3. Kopiera `tenant_id` och `shop_domain` från resultatet

### Alternativ B: Via Supabase CLI

```bash
supabase db execute "
SELECT 
  tenant_id,
  meta->>'store_domain' as shop_domain
FROM connections
WHERE source = 'shopify' AND status = 'connected';
"
```

## 🚀 Steg 3: Kör testet

### Metod 1: Använd test-script (enklast)

```bash
cd oj-analytics
./test-sync.sh
```

Scriptet kommer fråga efter:
- `tenant_id` (från steg 2)
- `shop domain` (från steg 2)

### Metod 2: Kör manuellt med curl

Först, hitta din Shopify app URL. Den ska vara något som:
- `http://localhost:3000` (lokalt)
- `https://permalink-xxx.trycloudflare.com` (tunnel)

Sedan:

```bash
# Sätt variabler (ersätt med dina värden)
TENANT_ID="7047fb33-7d77-4ab7-bb86-e8057f10ff35"  # Från steg 2
SHOP_DOMAIN="sandboxstorefront.myshopify.com"     # Från steg 2
SYNC_KEY="din-sync-service-key"                    # Från steg 1
APP_URL="http://localhost:3000"                    # Din app URL

# Kör sync
curl -X POST "${APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }"
```

## ✅ Steg 4: Verifiera resultat

### Kontrollera response

**Framgång:**
```json
{
  "synced": 5,
  "message": "Successfully synced 5 orders"
}
```

**Fel:**
- `401 Unauthorized` → SYNC_SERVICE_KEY är fel
- `No connected Shopify account found` → tenant_id matchar inte
- `Shop domain mismatch` → shopDomain matchar inte connection

### Verifiera data i Supabase

Kör dessa queries i Supabase SQL Editor:

```sql
-- 1. Kontrollera ordrar
SELECT 
  COUNT(*) as total_orders,
  MIN(processed_at) as first_order,
  MAX(processed_at) as last_order
FROM shopify_orders
WHERE tenant_id = 'din-tenant-id';  -- Ersätt med ditt tenant_id

-- 2. Kontrollera shop info
SELECT 
  domain,
  name,
  currency,
  updated_at
FROM shopify_shops
WHERE tenant_id = 'din-tenant-id';

-- 3. Kontrollera KPIs
SELECT 
  date,
  revenue,
  conversions,
  aov,
  updated_at
FROM kpi_daily
WHERE tenant_id = 'din-tenant-id' 
  AND source = 'shopify'
ORDER BY date DESC
LIMIT 10;

-- 4. Kontrollera job log
SELECT 
  status,
  error,
  started_at,
  finished_at
FROM jobs_log
WHERE tenant_id = 'din-tenant-id' 
  AND source = 'shopify'
ORDER BY created_at DESC
LIMIT 1;
```

## 🐛 Felsökning

### Problem: "SYNC_SERVICE_KEY saknas"
**Lösning:** Lägg till `SYNC_SERVICE_KEY=...` i `.env` filen

### Problem: "No connected Shopify account found"
**Lösning:** 
1. Verifiera att `tenant_id` är korrekt
2. Kontrollera att connection finns i Supabase med `status = 'connected'`
3. Kör SQL query från steg 2 för att hitta rätt tenant_id

### Problem: "Shop domain mismatch"
**Lösning:**
1. Använd exakt samma shop domain som finns i `connections.meta.store_domain`
2. Normalisera domain (inga `https://`, `www.`, eller trailing slashes)
3. Domain ska vara lowercase (t.ex. `sandboxstorefront.myshopify.com`)

### Problem: "Shopify API error 401"
**Lösning:**
1. Access token kan vara ogiltig
2. Gör om OAuth-kopplingen i huvudplattformen
3. Verifiera att `ENCRYPTION_KEY` är korrekt (samma som i huvudplattformen)

### Problem: "Connection refused" eller "Cannot connect"
**Lösning:**
1. Verifiera att Shopify appen körs: `shopify app dev`
2. Kontrollera att du använder rätt URL (localhost:3000 eller tunnel URL)
3. Om tunnel URL, kontrollera att den inte har gått ut

## 📝 Checklista

- [ ] `SYNC_SERVICE_KEY` är satt i `.env`
- [ ] `tenant_id` är hämtat från Supabase
- [ ] `shop_domain` är hämtat från Supabase
- [ ] Shopify appen körs (`shopify app dev`)
- [ ] Test-script eller curl-kommando körs
- [ ] Response visar `"synced": X` (X > 0)
- [ ] Data finns i `shopify_orders` tabellen
- [ ] Data finns i `shopify_shops` tabellen
- [ ] Data finns i `kpi_daily` tabellen
- [ ] Job log visar `status = 'succeeded'`

## 🎉 Nästa steg

När allt fungerar:
1. ✅ Data synkas korrekt till Supabase
2. ✅ Manual sync fungerar
3. ✅ Webhooks kan testas (skapa en testorder i Shopify)

Då kan vi gå vidare med att lägga till `read_customers` scope för kunddata!

