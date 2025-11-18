# Troubleshooting Guide

## OAuth Init Error i Huvudplattformen

Om du får ett server-side error när du klickar "Connect" i huvudplattformen, kontrollera följande:

### 1. Verifiera Redirect URI i Shopify Partner Dashboard

**Kritiskt:** Redirect URI måste matcha exakt.

1. Logga in på [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Välj din app "OJ Analytics"
3. Gå till **App setup** → **URLs**
4. Verifiera att **Allowed redirection URL(s)** är exakt:
   ```
   https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
   ```
5. **VIKTIGT:** Kontrollera att det inte finns:
   - Extra mellanslag
   - Trailing slash (`/` i slutet)
   - HTTP istället för HTTPS
   - `www.` prefix om det inte ska vara där

### 2. Kontrollera Environment Variables i Huvudplattformen

Huvudplattformens `/api/shopify/oauth/init` endpoint behöver följande environment variables:

```bash
# Shopify App Credentials (MÅSTE matcha Shopify-appen)
SHOPIFY_API_KEY=67673cdd3c82f441029e0ec2381e99e6
SHOPIFY_API_SECRET=<din_shopify_app_secret>

# OAuth Redirect URI (måste matcha Shopify Partner Dashboard)
SHOPIFY_REDIRECT_URI=https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
# eller
APP_BASE_URL=https://ohjay-dashboard.vercel.app

# Scopes (måste matcha Shopify-appen)
SHOPIFY_SCOPES=read_orders
# eller
SHOPIFY_SCOPES=read_orders,read_products,read_customers  # om du har fler scopes

# Encryption Key (MÅSTE matcha Shopify-appen exakt)
ENCRYPTION_KEY=f1a2c3d4e5f60718293a4b5c6d7e8f90abcdeffedcba0987654321fedcba0123
```

### 3. Kontrollera OAuth URL Konstruktion

I huvudplattformens `/api/shopify/oauth/init` endpoint, kontrollera att OAuth URL konstrueras korrekt:

```typescript
// Exempel på korrekt OAuth URL konstruktion
const shopifyAuthUrl = `https://${shopDomain}/admin/oauth/authorize?` +
  `client_id=${SHOPIFY_API_KEY}&` +
  `scope=${SCOPES}&` +
  `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
  `state=${encodeURIComponent(state)}`;
```

**Vanliga fel:**
- `redirect_uri` är inte URL-encoded
- `state` är inte URL-encoded
- `shopDomain` innehåller `https://` eller trailing slash
- `scope` är en array istället för komma-separerad sträng

### 4. Kontrollera State Parameter

Om huvudplattformen använder signerad state (rekommenderat), kontrollera:

```typescript
// State måste innehålla:
{
  tenantId: string,
  shopDomain: string,  // Normaliserad (ingen https://, www., eller trailing slash)
  timestamp: number,
  nonce: string
}

// State måste vara signerad med HMAC-SHA256
const signature = createHmac('sha256', ENCRYPTION_KEY)
  .update(JSON.stringify(stateData))
  .digest('hex');

// State måste vara base64-encoded
const state = Buffer.from(JSON.stringify({
  data: stateData,
  sig: signature
})).toString('base64');
```

**VIKTIGT:** `ENCRYPTION_KEY` måste vara **exakt samma** i både huvudplattformen och Shopify-appen.

### 5. Kontrollera Server Logs

I Vercel Dashboard:
1. Gå till ditt projekt
2. Klicka på **Functions** → **Logs**
3. Leta efter fel från `/api/shopify/oauth/init`
4. Vanliga fel:
   - `Missing environment variable: SHOPIFY_API_KEY`
   - `Invalid redirect_uri`
   - `State generation failed`
   - `Shop domain normalization failed`

### 6. Testa OAuth URL Manuellt

Du kan testa OAuth URL konstruktion manuellt:

```bash
# Ersätt med dina värden
SHOPIFY_API_KEY="67673cdd3c82f441029e0ec2381e99e6"
SHOPIFY_REDIRECT_URI="https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback"
SHOPIFY_SCOPES="read_orders"
SHOP_DOMAIN="din-butik.myshopify.com"

# Konstruera OAuth URL
OAUTH_URL="https://${SHOP_DOMAIN}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SHOPIFY_SCOPES}&redirect_uri=$(echo -n ${SHOPIFY_REDIRECT_URI} | jq -sRr @uri)"

echo $OAUTH_URL
```

Kopiera URL:en och öppna i webbläsaren. Om den fungerar, är problemet i state-parameter eller callback-hantering.

### 7. Verifiera Shop Domain Normalisering

Shop domain måste normaliseras på samma sätt i både huvudplattformen och Shopify-appen:

```typescript
function normalizeShopDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')  // Ta bort https://
    .replace(/^www\./, '')         // Ta bort www.
    .replace(/\/$/, '')            // Ta bort trailing slash
    .toLowerCase();                // Lowercase
}

// Exempel:
normalizeShopDomain('https://www.store.myshopify.com/') 
// => 'store.myshopify.com'
```

### 8. Checklista för Huvudplattformens `/api/shopify/oauth/init`

- [ ] Endpoint tar emot `tenantId` och `shopDomain` i request body
- [ ] `shopDomain` normaliseras korrekt
- [ ] `SHOPIFY_API_KEY` finns i environment variables
- [ ] `SHOPIFY_API_SECRET` finns i environment variables
- [ ] `SHOPIFY_REDIRECT_URI` matchar exakt Shopify Partner Dashboard
- [ ] `ENCRYPTION_KEY` matchar Shopify-appen exakt
- [ ] State parameter konstrueras korrekt (om signerad state används)
- [ ] OAuth URL är korrekt URL-encoded
- [ ] Response returnerar `{ url: string }` med OAuth URL

### 9. Testa med cURL

Testa huvudplattformens endpoint direkt:

```bash
curl -X POST https://ohjay-dashboard.vercel.app/api/shopify/oauth/init \
  -H "Content-Type: application/json" \
  -H "Cookie: <din_session_cookie>" \
  -d '{
    "tenantId": "test-tenant-id",
    "shopDomain": "din-butik.myshopify.com"
  }'
```

Förväntat svar:
```json
{
  "url": "https://din-butik.myshopify.com/admin/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=..."
}
```

Om detta misslyckas, är problemet i huvudplattformens endpoint.

## Vanliga Fel och Lösningar

### "Invalid redirect_uri"
- **Orsak:** Redirect URI matchar inte Shopify Partner Dashboard
- **Lösning:** Verifiera exakt matchning i Shopify Partner Dashboard

### "State validation failed"
- **Orsak:** `ENCRYPTION_KEY` matchar inte mellan huvudplattformen och Shopify-appen
- **Lösning:** Verifiera att samma `ENCRYPTION_KEY` används i båda

### "Shop domain mismatch"
- **Orsak:** Shop domain normaliseras olika i huvudplattformen vs Shopify-appen
- **Lösning:** Använd samma `normalizeShopDomain` funktion i båda

### "Missing environment variable"
- **Orsak:** Environment variable saknas i Vercel
- **Lösning:** Lägg till i Vercel Dashboard → Settings → Environment Variables

## Nästa Steg

Om problemet kvarstår efter att ha kontrollerat ovanstående:

1. **Kontrollera Vercel Logs** för exakt felmeddelande
2. **Testa OAuth URL manuellt** (se steg 6)
3. **Verifiera att alla environment variables är satta** i Vercel
4. **Kontrollera att Shopify Partner Dashboard har rätt redirect URI**

Om du behöver mer hjälp, samla in:
- Exakt felmeddelande från Vercel logs
- OAuth URL som genereras (utan secrets)
- Environment variables som används (utan secrets)

