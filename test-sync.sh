#!/bin/bash

# Test script för manual sync
# Användning: ./test-sync.sh

set -e

echo "🔍 Testar Manual Sync till Supabase"
echo "===================================="
echo ""

# Färger för output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Läs environment variables från .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env filen finns inte!${NC}"
    exit 1
fi

# Ladda .env variabler
export $(grep -v '^#' .env | xargs)

# Kontrollera att nödvändiga variabler finns
if [ -z "$SYNC_SERVICE_KEY" ]; then
    echo -e "${RED}❌ SYNC_SERVICE_KEY saknas i .env${NC}"
    exit 1
fi

if [ -z "$SHOPIFY_APP_URL" ]; then
    echo -e "${YELLOW}⚠️  SHOPIFY_APP_URL är tom. Använder localhost:3000 som default.${NC}"
    SHOPIFY_APP_URL="http://localhost:3000"
fi

echo "📋 Konfiguration:"
echo "   Shopify App URL: ${SHOPIFY_APP_URL}"
echo "   SYNC_SERVICE_KEY: ${SYNC_SERVICE_KEY:0:10}... (dold)"
echo ""

# Fråga användaren om tenant_id och shopDomain
read -p "Ange tenant_id (från Supabase connections tabellen): " TENANT_ID
read -p "Ange shop domain (t.ex. sandboxstorefront.myshopify.com): " SHOP_DOMAIN

if [ -z "$TENANT_ID" ] || [ -z "$SHOP_DOMAIN" ]; then
    echo -e "${RED}❌ tenant_id och shopDomain krävs!${NC}"
    exit 1
fi

# Normalisera shop domain (ta bort https://, www., trailing slash)
SHOP_DOMAIN=$(echo "$SHOP_DOMAIN" | sed 's|^https\?://||' | sed 's|^www\.||' | sed 's|/$||' | tr '[:upper:]' '[:lower:]')

echo ""
echo "🚀 Kör manual sync..."
echo "   Tenant ID: ${TENANT_ID}"
echo "   Shop Domain: ${SHOP_DOMAIN}"
echo ""

# Kör sync request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SHOPIFY_APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_SERVICE_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }")

# Separera response body och status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "   HTTP Status: ${HTTP_CODE}"
echo "   Body: ${BODY}"
echo ""

# Kontrollera resultat
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Sync lyckades!${NC}"
    
    # Försök extrahera antal synkade ordrar
    SYNCED=$(echo "$BODY" | grep -o '"synced":[0-9]*' | grep -o '[0-9]*' || echo "unknown")
    echo "   Synkade ordrar: ${SYNCED}"
    echo ""
    echo "💡 Tips: Verifiera data i Supabase med SQL-queries från TEST_DATA_SYNC.md"
else
    echo -e "${RED}❌ Sync misslyckades!${NC}"
    echo "   Kontrollera felmeddelandet ovan"
    echo ""
    echo "💡 Vanliga problem:"
    echo "   - Connection finns inte i Supabase"
    echo "   - Shop domain matchar inte connection"
    echo "   - SYNC_SERVICE_KEY är fel"
    echo "   - Shopify appen körs inte (shopify app dev)"
    exit 1
fi

