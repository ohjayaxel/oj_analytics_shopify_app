-- Kör denna query i Supabase SQL Editor för att hämta connection info
-- Kopiera tenant_id och shop_domain från resultatet

SELECT 
  tenant_id,
  meta->>'store_domain' as shop_domain,
  status,
  created_at,
  updated_at
FROM connections
WHERE source = 'shopify' 
  AND status = 'connected'
ORDER BY created_at DESC
LIMIT 5;

