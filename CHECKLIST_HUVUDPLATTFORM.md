# Checklista: Fixa OAuth i Huvudplattformen

## 1. Environment Variables (Vercel)

Kontrollera i Vercel Dashboard → Settings → Environment Variables:

- [ ] `SHOPIFY_API_KEY` = `67673cdd3c82f441029e0ec2381e99e6` (exakt, inga mellanslag)
- [ ] `SHOPIFY_SCOPES` = `read_orders` (inte `read_orders,read_analytics`)
- [ ] `SHOPIFY_API_SECRET` finns och är korrekt

## 2. Redirect URI i Koden

I `/api/shopify/oauth/init` endpoint:

- [ ] `SHOPIFY_REDIRECT_URI` = `"https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback"`
- [ ] **INGEN trailing slash** (`/` i slutet)
- [ ] **INGEN www.** prefix
- [ ] **HTTPS**, inte HTTP

## 3. OAuth URL Konstruktion

I `/api/shopify/oauth/init` endpoint:

- [ ] `redirect_uri` är URL-encoded: `encodeURIComponent(SHOPIFY_REDIRECT_URI)`
- [ ] Shop domain är normaliserad (ingen `https://`, `www.`, eller trailing slash)
- [ ] `scope` är exakt `read_orders` (inte `read_orders,read_analytics`)

**Exempel på korrekt kod:**
```typescript
const SHOPIFY_REDIRECT_URI = "https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback";
const normalizedShop = shopDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();

const oauthUrl = `https://${normalizedShop}/admin/oauth/authorize?` +
  `client_id=${SHOPIFY_API_KEY}&` +
  `scope=${SCOPES}&` +
  `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
  `state=${encodeURIComponent(state)}`;
```

## 4. Debug Logging (tillfälligt)

Lägg till i `/api/shopify/oauth/init` innan `return`:

```typescript
console.log('=== OAuth Debug ===');
console.log('Client ID:', SHOPIFY_API_KEY);
console.log('Scopes:', SCOPES);
console.log('Redirect URI:', SHOPIFY_REDIRECT_URI);
console.log('OAuth URL:', oauthUrl);
```

## 5. Testa och Verifiera

- [ ] Testa OAuth-flödet
- [ ] Kontrollera Vercel logs för OAuth URL
- [ ] Verifiera att `redirect_uri` i OAuth URL är URL-encoded
- [ ] Verifiera att `client_id` matchar `67673cdd3c82f441029e0ec2381e99e6`
- [ ] Verifiera att `scope` är exakt `read_orders`

## Vanliga Fel

❌ `redirect_uri` har trailing slash: `.../callback/`  
✅ `redirect_uri` utan trailing slash: `.../callback`

❌ `redirect_uri` inte URL-encoded i OAuth URL  
✅ `redirect_uri` är URL-encoded: `https%3A%2F%2F...`

❌ `SHOPIFY_SCOPES` = `read_orders,read_analytics`  
✅ `SHOPIFY_SCOPES` = `read_orders`

❌ `SHOPIFY_API_KEY` har mellanslag eller är fel  
✅ `SHOPIFY_API_KEY` = `67673cdd3c82f441029e0ec2381e99e6` (exakt)

