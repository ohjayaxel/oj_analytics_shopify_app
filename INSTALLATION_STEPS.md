# Installation Steps - OJ Analytics Shopify App

## ✅ Konfiguration verifierad

- ✅ `shopify.app.toml` har korrekt Client ID och Redirect URI
- ✅ Scopes: `read_orders`
- ✅ Redirect URI: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
- ✅ API version: `2025-10`

## Steg för Installation

### 1. Starta Shopify App (om inte redan igång)

```bash
cd oj-analytics
shopify app dev
```

Detta startar appen och skapar en tunnel-URL.

### 2. Installera Appen i Shopify

1. Öppna din dev store: `https://sandboxstorefront.myshopify.com/admin`
2. Gå till **Apps** → **Develop apps**
3. Klicka på **"OJ Analytics"** (eller sök efter den)
4. Klicka på **"Install app"**
5. Godkänn scopes (`read_orders`)

### 3. Testa OAuth Flow

Efter installation:
1. Appen öppnas automatiskt i Shopify Admin
2. Du ser status-sidan med "Not Connected"
3. Klicka på **"Connect Store"**
4. Du redirectas till huvudplattformens `/connect/shopify` sida
5. Välj tenant och klicka **"Connect"**
6. OAuth-flödet börjar

### 4. Verifiera OAuth fungerar

Om OAuth fungerar:
- Du redirectas tillbaka till huvudplattformens callback
- Connection sparas i Supabase
- Du redirectas till integrations-sidan

Om OAuth fortfarande inte fungerar:
- Kontrollera Vercel logs för OAuth URL
- Verifiera att Redirect URI matchar exakt i Partner Dashboard
- Se `DEBUG_PARTNER_DASHBOARD.md` för felsökning

## Snabb Checklista

- [ ] Shopify app är igång (`shopify app dev`)
- [ ] Appen är installerad i dev store
- [ ] Status-sidan visar "Not Connected"
- [ ] "Connect Store" knappen fungerar
- [ ] Redirect till huvudplattformen fungerar
- [ ] OAuth-flödet fungerar (ingen "accounts.shopify.com avvisade anslutningen")

## Om OAuth fortfarande inte fungerar

1. **Kontrollera Partner Dashboard:**
   - Version_2 är **Released** (inte bara Active)
   - Redirect URI är exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
   - Scopes är exakt: `read_orders`

2. **Kontrollera Vercel:**
   - `SHOPIFY_API_KEY` = `67673cdd3c82f441029e0ec2381e99e6`
   - `SHOPIFY_SCOPES` = `read_orders`
   - `SHOPIFY_REDIRECT_URI` = `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`

3. **Testa OAuth URL direkt:**
   - Kopiera OAuth URL från Vercel logs
   - Öppna i inkognito-webbläsare
   - Om det fortfarande inte fungerar, är problemet i Partner Dashboard

