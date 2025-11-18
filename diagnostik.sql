-- Diagnostik: Kontrollera varför data inte syns
-- Kör dessa queries i Supabase SQL Editor

-- 1. Hitta tenant_id för "orange-juice-demo"
-- (tenant_id är förmodligen ett UUID, inte slug)
SELECT 
  tenant_id,
  source,
  status,
  meta->>'store_domain' as shop_domain,
  created_at,
  updated_at
FROM connections
WHERE source = 'shopify' 
  AND status = 'connected'
ORDER BY created_at DESC;

-- 2. Kontrollera om det finns ordrar för denna tenant
-- (Ersätt 'TENANT_ID_HÄR' med tenant_id från query 1)
SELECT 
  COUNT(*) as total_orders,
  COUNT(DISTINCT processed_at) as unique_dates,
  MIN(processed_at) as first_order_date,
  MAX(processed_at) as last_order_date,
  SUM(total_price) as total_revenue
FROM shopify_orders
WHERE tenant_id = 'TENANT_ID_HÄR';  -- Ersätt med tenant_id från query 1

-- 3. Kontrollera KPIs
SELECT 
  date,
  revenue,
  conversions,
  aov,
  source,
  updated_at
FROM kpi_daily
WHERE tenant_id = 'TENANT_ID_HÄR'  -- Ersätt med tenant_id från query 1
  AND source = 'shopify'
ORDER BY date DESC
LIMIT 10;

-- 4. Kontrollera job logs för fel
SELECT 
  status,
  error,
  started_at,
  finished_at,
  created_at
FROM jobs_log
WHERE tenant_id = 'TENANT_ID_HÄR'  -- Ersätt med tenant_id från query 1
  AND source = 'shopify'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Kontrollera om webhooks har triggats (via job logs)
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as succeeded,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  MAX(created_at) as last_job
FROM jobs_log
WHERE tenant_id = 'TENANT_ID_HÄR'  -- Ersätt med tenant_id från query 1
  AND source = 'shopify';

