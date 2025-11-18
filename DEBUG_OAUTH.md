# Debug: "accounts.shopify.com avvisade anslutningen"

Detta fel uppstår när Shopify avvisar OAuth-begäran. Låt oss debugga steg för steg.

## Steg 1: Verifiera Redirect URI Matchar Exakt

### I Shopify Partner Dashboard (Version_2):
- Redirect URLs: `["https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback"]`
- ✅ Kontrollera att det är EXAKT detta (ingen trailing slash, ingen www.)

### I Huvudplattformens `/api/shopify/oauth/init`:
Kontrollera att `redirect_uri` är exakt:
```typescript
const SHOPIFY_REDIRECT_URI = "https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback";
```

**VIKTIGT:** Använd `encodeURIComponent()` när du lägger till det i OAuth URL:
```typescript
const oauthUrl = `https://${shopDomain}/admin/oauth/authorize?` +
  `client_id=${SHOPIFY_API_KEY}&` +
  `scope=${SCOPES}&` +
  `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
  `state=${encodeURIComponent(state)}`;
```

## Steg 2: Verifiera Client ID Matchar

### I Shopify Partner Dashboard:
- Client ID: `67673cdd3c82f441029e0ec2381e99e6`

### I Huvudplattformens Environment Variables:
```bash
SHOPIFY_API_KEY=67673cdd3c82f441029e0ec2381e99e6
```

**Kontrollera:** Öppna Vercel Dashboard → Settings → Environment Variables och verifiera att `SHOPIFY_API_KEY` är exakt `67673cdd3c82f441029e0ec2381e99e6`

## Steg 3: Verifiera Scopes Matchar

### I Shopify Partner Dashboard:
- Scopes: `read_orders`

### I Huvudplattformens Environment Variables:
```bash
SHOPIFY_SCOPES=read_orders
```

**Kontrollera:** Verifiera att scopes i OAuth URL är exakt `read_orders` (inte `read_orders,read_analytics` eller något annat)

## Steg 4: Debug OAuth URL i Huvudplattformen

Lägg till logging i huvudplattformens `/api/shopify/oauth/init`:

```typescript
// I /api/shopify/oauth/init endpoint
export async function POST(request: Request) {
  const { tenantId, shopDomain } = await request.json();
  
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
  const SHOPIFY_REDIRECT_URI = "https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback";
  const SCOPES = "read_orders";
  
  // Normalisera shop domain
  const normalizedShop = shopDomain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
  
  // Konstruera OAuth URL
  const oauthUrl = `https://${normalizedShop}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_API_KEY}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
    `state=${encodeURIComponent(state)}`;
  
  // DEBUG: Logga OAuth URL (ta bort efter debugging)
  console.log('=== OAuth URL Debug ===');
  console.log('Shop Domain:', normalizedShop);
  console.log('Client ID:', SHOPIFY_API_KEY);
  console.log('Scopes:', SCOPES);
  console.log('Redirect URI:', SHOPIFY_REDIRECT_URI);
  console.log('Full OAuth URL:', oauthUrl);
  console.log('======================');
  
  return Response.json({ url: oauthUrl });
}
```

## Steg 5: Testa OAuth URL Manuellt

1. Öppna Vercel Dashboard → Functions → Logs
2. Anropa `/api/shopify/oauth/init` från Shopify-appen
3. Kopiera OAuth URL från logs
4. Öppna OAuth URL i webbläsaren (inkognito-läge)
5. Om du fortfarande får "accounts.shopify.com avvisade anslutningen":
   - Kopiera OAuth URL:en
   - Jämför `redirect_uri` parametern med Shopify Partner Dashboard
   - Jämför `client_id` parametern med Client ID i Partner Dashboard
   - Jämför `scope` parametern med Scopes i Partner Dashboard

## Steg 6: Verifiera Shop Domain

Kontrollera att shop domain är korrekt normaliserad:
- ✅ `store.myshopify.com` (korrekt)
- ❌ `https://store.myshopify.com` (fel - har https://)
- ❌ `www.store.myshopify.com` (fel - har www.)
- ❌ `store.myshopify.com/` (fel - har trailing slash)

## Vanliga Fel

### Fel 1: Redirect URI har trailing slash
```
❌ https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback/
✅ https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

### Fel 2: Redirect URI är inte URL-encoded i OAuth URL
```typescript
❌ redirect_uri=https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
✅ redirect_uri=https%3A%2F%2Fohjay-dashboard.vercel.app%2Fapi%2Foauth%2Fshopify%2Fcallback
```

### Fel 3: Client ID är fel
```
❌ SHOPIFY_API_KEY är inte 67673cdd3c82f441029e0ec2381e99e6
✅ SHOPIFY_API_KEY=67673cdd3c82f441029e0ec2381e99e6
```

### Fel 4: Scopes innehåller extra scopes
```
❌ scope=read_orders,read_analytics
✅ scope=read_orders
```

## Checklista

- [ ] Redirect URI i Shopify Partner Dashboard: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback` (exakt, ingen trailing slash)
- [ ] Redirect URI i huvudplattformen matchar exakt
- [ ] `redirect_uri` är URL-encoded i OAuth URL (`encodeURIComponent()`)
- [ ] `SHOPIFY_API_KEY` i Vercel är `67673cdd3c82f441029e0ec2381e99e6`
- [ ] `SHOPIFY_SCOPES` i Vercel är `read_orders` (inte `read_orders,read_analytics`)
- [ ] Shop domain är normaliserad korrekt (ingen https://, www., eller trailing slash)
- [ ] OAuth URL loggas i Vercel logs för verifiering

## Nästa Steg

1. Lägg till logging i `/api/shopify/oauth/init` (se Steg 4)
2. Testa OAuth-flödet igen
3. Kontrollera Vercel logs för OAuth URL
4. Jämför OAuth URL parametrar med Shopify Partner Dashboard
5. Om problemet kvarstår, kopiera exakt OAuth URL från logs och dela den (ta bort secrets)

