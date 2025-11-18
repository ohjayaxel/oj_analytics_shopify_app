#!/bin/bash

# Script för att köra manual sync
# Användning: ./kör-sync.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 Manual Sync till Supabase"
echo "============================"
echo ""

# Ladda .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env filen finns inte!${NC}"
    exit 1
fi

export $(grep -v '^#' .env | xargs)

# Kontrollera SYNC_SERVICE_KEY
if [ -z "$SYNC_SERVICE_KEY" ]; then
    echo -e "${RED}❌ SYNC_SERVICE_KEY saknas i .env${NC}"
    exit 1
fi

# Hitta app URL
if [ -n "$SHOPIFY_APP_URL" ] && [ "$SHOPIFY_APP_URL" != "" ]; then
    APP_URL="$SHOPIFY_APP_URL"
    echo "📡 Använder SHOPIFY_APP_URL: ${APP_URL}"
elif lsof -ti:3000 > /dev/null 2>&1; then
    APP_URL="http://localhost:3000"
    echo "📡 Använder localhost:3000"
else
    echo -e "${YELLOW}⚠️  Kan inte hitta app URL. Ange manuellt:${NC}"
    read -p "App URL (t.ex. http://localhost:3000 eller https://xxx.trycloudflare.com): " APP_URL
fi

echo ""

# Fråga efter tenant_id och shop_domain
read -p "Ange tenant_id (från Supabase connections tabellen): " TENANT_ID
read -p "Ange shop domain (t.ex. sandboxstorefront.myshopify.com): " SHOP_DOMAIN

if [ -z "$TENANT_ID" ] || [ -z "$SHOP_DOMAIN" ]; then
    echo -e "${RED}❌ tenant_id och shop_domain krävs!${NC}"
    exit 1
fi

# Normalisera shop domain
SHOP_DOMAIN=$(echo "$SHOP_DOMAIN" | sed 's|^https\?://||' | sed 's|^www\.||' | sed 's|/$||' | tr '[:upper:]' '[:lower:]')

echo ""
echo "🚀 Kör sync..."
echo "   Tenant ID: ${TENANT_ID}"
echo "   Shop Domain: ${SHOP_DOMAIN}"
echo "   App URL: ${APP_URL}"
echo ""

# Kör sync
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/app/api/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SYNC_SERVICE_KEY}" \
  -d "{
    \"tenantId\": \"${TENANT_ID}\",
    \"shopDomain\": \"${SHOP_DOMAIN}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response:"
echo "   HTTP Status: ${HTTP_CODE}"
echo "   Body: ${BODY}"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Sync lyckades!${NC}"
    SYNCED=$(echo "$BODY" | grep -o '"synced":[0-9]*' | grep -o '[0-9]*' || echo "unknown")
    echo "   Synkade ordrar: ${SYNCED}"
    echo ""
    echo "💡 Verifiera data i Supabase med SQL-queries från diagnostik.sql"
else
    echo -e "${RED}❌ Sync misslyckades!${NC}"
    echo ""
    echo "💡 Vanliga problem:"
    echo "   - Connection finns inte i Supabase"
    echo "   - Shop domain matchar inte connection"
    echo "   - SYNC_SERVICE_KEY är fel"
    echo "   - Shopify appen körs inte"
    exit 1
fi

