# Verifiera Redirect URI Matchar Exakt

OAuth URL:en ser korrekt ut, men Shopify avvisar fortfarande. Detta tyder på att Redirect URI inte matchar exakt.

## Steg 1: Verifiera Redirect URI i Shopify Partner Dashboard

1. Gå till [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Välj appen **"OJ Analytics"**
3. Gå till **App setup** → **URLs**
4. Under **"Allowed redirection URL(s)"**, kontrollera att det står EXAKT:

```
https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

**Kontrollera:**
- ✅ Inga trailing slashes (`/` i slutet)
- ✅ Inga mellanslag
- ✅ HTTPS (inte HTTP)
- ✅ Ingen `www.` prefix
- ✅ Exakt samma som i OAuth URL (efter URL-decoding)

## Steg 2: URL-decode Redirect URI från OAuth URL

Från dina logs:
```
redirect_uri=https%3A%2F%2Fohjay-dashboard.vercel.app%2Fapi%2Foauth%2Fshopify%2Fcallback
```

URL-dekodad blir detta:
```
https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

Detta måste matcha EXAKT med vad som står i Shopify Partner Dashboard.

## Steg 3: Kontrollera App Version Status

1. I Shopify Partner Dashboard, gå till **Versions**
2. Kontrollera att **Version_2** är **Active** och **Released**
3. Om appen är i "Draft" eller "Unreleased", publicera den

## Steg 4: Kontrollera App Distribution

1. I Shopify Partner Dashboard, gå till **App setup** → **Distribution**
2. Kontrollera att appen är konfigurerad korrekt:
   - **App distribution**: App Store (eller Custom)
   - **App status**: Active

## Steg 5: Testa med en Annan Shop

Om problemet kvarstår, testa med en annan shop för att utesluta shop-specifika problem.

## Steg 6: Kontrollera App Credentials

1. I Shopify Partner Dashboard, gå till **App setup** → **Client credentials**
2. Verifiera att **Client ID** är: `67673cdd3c82f441029e0ec2381e99e6`
3. Verifiera att **Client secret** matchar `SHOPIFY_API_SECRET` i Vercel

## Steg 7: Kontrollera Scopes i Partner Dashboard

1. I Shopify Partner Dashboard, gå till **Versions** → **Version_2**
2. Under **Access**, kontrollera att **Scopes** är exakt: `read_orders`
3. Om det står `read_orders,read_analytics` eller något annat, uppdatera till bara `read_orders`

## Vanliga Problem

### Problem 1: Redirect URI har trailing slash i Partner Dashboard
```
❌ https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback/
✅ https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

### Problem 2: Redirect URI har www. i Partner Dashboard
```
❌ https://www.ohjay-dashboard.vercel.app/api/oauth/shopify/callback
✅ https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

### Problem 3: App Version är inte Released
- Appen måste vara **Released** och **Active** för att OAuth ska fungera

### Problem 4: Scopes matchar inte
- Partner Dashboard: `read_orders,read_analytics`
- OAuth URL: `read_orders`
- **Lösning**: Uppdatera Partner Dashboard till bara `read_orders`

## Nästa Steg

1. **Kontrollera Redirect URI i Partner Dashboard** - Verifiera exakt matchning
2. **Kontrollera App Version Status** - Måste vara Released och Active
3. **Kontrollera Scopes** - Måste matcha exakt `read_orders`
4. **Om problemet kvarstår**: Ta en skärmbild av "Allowed redirection URL(s)" i Partner Dashboard

