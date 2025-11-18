# Fix: "accounts.shopify.com avvisade anslutningen"

Detta fel uppstår när Shopify avvisar OAuth-begäran. Det beror oftast på att **Redirect URI inte matchar** exakt det som är konfigurerat i Shopify Partner Dashboard.

## Snabb Fix

### Steg 1: Verifiera Redirect URI i Shopify Partner Dashboard

1. Logga in på [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Välj din app **"OJ Analytics"** (Client ID: `67673cdd3c82f441029e0ec2381e99e6`)
3. Gå till **App setup** → **URLs**
4. Under **Allowed redirection URL(s)**, kontrollera att det står exakt:
   ```
   https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
   ```

### Steg 2: Kontrollera att Redirect URI i Huvudplattformen Matchar

I huvudplattformens `/api/shopify/oauth/init` endpoint, kontrollera att `redirect_uri` är exakt:

```typescript
const SHOPIFY_REDIRECT_URI = "https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback";

// I OAuth URL konstruktion:
const oauthUrl = `https://${shopDomain}/admin/oauth/authorize?` +
  `client_id=${SHOPIFY_API_KEY}&` +
  `scope=${SCOPES}&` +
  `redirect_uri=${encodeURIComponent(SHOPIFY_REDIRECT_URI)}&` +
  `state=${encodeURIComponent(state)}`;
```

**VIKTIGT:**
- ✅ Använd `encodeURIComponent()` för `redirect_uri`
- ✅ Inga trailing slashes (`/` i slutet)
- ✅ Inga mellanslag
- ✅ Exakt samma URL som i Shopify Partner Dashboard

### Steg 3: Verifiera Client ID

Kontrollera att `SHOPIFY_API_KEY` i huvudplattformen är exakt:
```
67673cdd3c82f441029e0ec2381e99e6
```

### Steg 4: Verifiera Scopes

Kontrollera att scopes matchar `shopify.app.toml`:
- I `shopify.app.toml`: `scopes = "read_orders"`
- I huvudplattformen: `SHOPIFY_SCOPES = "read_orders"`

## Vanliga Fel

### Fel 1: Trailing Slash
❌ `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback/`  
✅ `https://www.ohjay-dashboard.vercel.app/api/oauth/shopify/callback`

### Fel 2: www. Prefix
❌ `https://www.ohjay-dashboard.vercel.app/api/oauth/shopify/callback`  
✅ `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`

### Fel 3: HTTP istället för HTTPS
❌ `http://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`  
✅ `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`

### Fel 4: Fel Client ID
❌ `SHOPIFY_API_KEY` är inte `67673cdd3c82f441029e0ec2381e99e6`  
✅ Verifiera att Client ID matchar exakt

## Testa OAuth URL Manuellt

1. Öppna huvudplattformens `/api/shopify/oauth/init` endpoint i Postman/curl
2. Kopiera OAuth URL från response
3. Öppna URL:en i webbläsaren
4. Om du ser "accounts.shopify.com avvisade anslutningen", är problemet:
   - Redirect URI matchar inte
   - Client ID är fel
   - Scopes är felaktiga

## Debug: Logga OAuth URL

I huvudplattformens `/api/shopify/oauth/init`, lägg till logging:

```typescript
console.log('OAuth URL:', oauthUrl);
console.log('Redirect URI:', SHOPIFY_REDIRECT_URI);
console.log('Client ID:', SHOPIFY_API_KEY);
console.log('Scopes:', SCOPES);
```

Kontrollera Vercel logs för att se exakt vad som skickas till Shopify.

## Checklista

- [ ] Redirect URI i Shopify Partner Dashboard är exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
- [ ] Redirect URI i huvudplattformen matchar exakt (ingen trailing slash, ingen www.)
- [ ] `SHOPIFY_API_KEY` i huvudplattformen är `67673cdd3c82f441029e0ec2381e99e6`
- [ ] `redirect_uri` är URL-encoded i OAuth URL
- [ ] Scopes matchar (`read_orders`)
- [ ] OAuth URL använder HTTPS (inte HTTP)

## Nästa Steg

Om problemet kvarstår efter att ha kontrollerat ovanstående:

1. **Kontrollera Vercel logs** för exakt OAuth URL som genereras
2. **Jämför Redirect URI** i OAuth URL med Shopify Partner Dashboard
3. **Testa med en annan shop domain** för att utesluta shop-specifika problem
4. **Kontrollera att appen inte är pausad** i Shopify Partner Dashboard

