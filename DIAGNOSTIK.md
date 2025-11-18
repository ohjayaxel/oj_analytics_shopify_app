# Diagnostik: Varför syns ingen data?

## Möjliga orsaker:

### 1. **Ingen historisk data har synkats**
Webhooks triggas bara när **nya** ordrar skapas/uppdateras. Om ordrar skapades innan webhooks aktiverades, finns de inte i Supabase ännu.

**Lösning:** Kör manual sync för att hämta historisk data.

### 2. **Inga ordrar har skapats efter webhook aktiverades**
Webhooks triggas bara när något händer. Om inga nya ordrar skapats efter att webhooks aktiverades, kommer inget hända.

**Lösning:** 
- Skapa en testorder i Shopify
- Eller kör manual sync för att hämta befintliga ordrar

### 3. **Webhook URL är fel i Shopify Partner Dashboard**
Webhooks måste vara registrerade i Shopify Partner Dashboard med rätt URL.

**Kontrollera:**
- Shopify Partner Dashboard → App → Webhooks
- Verifiera att `orders/create` och `orders/updated` är registrerade
- Verifiera att URL är korrekt (t.ex. `https://din-tunnel-url.trycloudflare.com/webhooks/shopify`)

### 4. **Tenant ID matchar inte**
"orange-juice-demo" är en slug, men `tenant_id` i Supabase är ett UUID. Huvudplattformen måste mappa slug → tenant_id.

**Kontrollera:**
- Kör query från `diagnostik.sql` för att hitta rätt tenant_id
- Verifiera att connection i Supabase har rätt tenant_id

### 5. **Data finns i Supabase men huvudplattformen läser inte från rätt tabell**
Detta är inte Shopify-appens problem, men kontrollera att huvudplattformen läser från:
- `kpi_daily` tabellen (inte `shopify_orders` direkt)
- Med rätt `tenant_id` och `source = 'shopify'`

## Snabbdiagnostik:

Kör dessa queries i Supabase SQL Editor (se `diagnostik.sql`):

1. **Hitta tenant_id:**
```sql
SELECT tenant_id, meta->>'store_domain' as shop_domain
FROM connections
WHERE source = 'shopify' AND status = 'connected';
```

2. **Kontrollera om det finns ordrar:**
```sql
SELECT COUNT(*) FROM shopify_orders WHERE tenant_id = 'TENANT_ID_HÄR';
```

3. **Kontrollera KPIs:**
```sql
SELECT date, revenue, conversions FROM kpi_daily 
WHERE tenant_id = 'TENANT_ID_HÄR' AND source = 'shopify' 
ORDER BY date DESC LIMIT 10;
```

4. **Kontrollera job logs:**
```sql
SELECT status, error, created_at FROM jobs_log 
WHERE tenant_id = 'TENANT_ID_HÄR' AND source = 'shopify' 
ORDER BY created_at DESC LIMIT 5;
```

## Nästa steg:

1. **Kör manual sync** för att hämta historisk data
2. **Skapa en testorder** i Shopify för att testa webhooks
3. **Kontrollera webhook logs** i Shopify Partner Dashboard
4. **Verifiera att huvudplattformen läser från rätt tabell**

