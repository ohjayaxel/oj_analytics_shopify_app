# Debug: "accounts.shopify.com avvisade anslutningen" - Final Fix

## Problem

OAuth fungerar fortfarande inte trots att App URL är korrekt. Detta tyder på att OAuth URL:en från huvudplattformen inte matchar exakt med Shopify Partner Dashboard.

## Kritiska Punkter att Verifiera

### 1. Verifiera Redirect URI Matchar EXAKT

I Shopify Partner Dashboard → Versions → Version_3 (eller senaste):
- **Redirect URLs** måste vara EXAKT: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
- **INGEN trailing slash** (`/` i slutet)
- **INGEN www.** prefix
- **HTTPS**, inte HTTP

**Test:** Kopiera Redirect URI från Partner Dashboard och jämför tecken för tecken med OAuth URL:en från Vercel logs.

### 2. Verifiera OAuth URL från Vercel Logs

Från dina tidigare logs:
```
redirect_uri=https%3A%2F%2Fohjay-dashboard.vercel.app%2Fapi%2Foauth%2Fshopify%2Fcallback
```

URL-dekodad blir detta:
```
https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback
```

Detta måste matcha EXAKT med Redirect URI i Partner Dashboard.

### 3. Verifiera Client ID Matchar

I Vercel logs:
```
Client ID: 67673cdd3c82f441029e0ec2381e99e6
```

I Partner Dashboard → App setup → Client credentials:
- **Client ID** måste vara exakt: `67673cdd3c82f441029e0ec2381e99e6`

### 4. Verifiera Scopes Matchar

I Vercel logs:
```
Scopes: read_orders
```

I Partner Dashboard → Versions → Version_3 → Access:
- **Scopes** måste vara exakt: `read_orders`
- **INTE** `read_orders,read_analytics` eller något annat

### 5. Verifiera Version är Released

I Partner Dashboard → Versions:
- Version_3 (eller senaste) måste vara:
  - ✅ **Active**
  - ✅ **Released** (inte "Draft" eller "Unreleased")

Om versionen inte är Released:
1. Klicka på versionen
2. Klicka på **"Release version"** eller **"Publish"**
3. Vänta 1-2 minuter
4. Testa OAuth igen

## Steg-för-Steg Debug

### Steg 1: Kontrollera Vercel Logs

1. Öppna Vercel Dashboard → Functions → Logs
2. Leta efter OAuth URL från `/api/shopify/oauth/init`
3. Kopiera hela OAuth URL:en
4. URL-dekoda `redirect_uri` parametern

### Steg 2: Jämför med Partner Dashboard

1. Öppna Shopify Partner Dashboard → Versions → Version_3
2. Kopiera Redirect URI från "Redirect URLs"
3. Jämför tecken för tecken med URL-dekodad `redirect_uri` från OAuth URL

**De måste matcha EXAKT:**
- Inga trailing slashes
- Inga mellanslag
- Samma case (lowercase)
- Samma domain

### Steg 3: Testa OAuth URL Direkt

1. Kopiera OAuth URL:en från Vercel logs
2. Öppna i en inkognito-webbläsare
3. Om du fortfarande får "accounts.shopify.com avvisade anslutningen", är problemet definitivt i Partner Dashboard-konfigurationen

### Steg 4: Ta Bort och Lägg Till Redirect URI Igen

Ibland kan det finnas dolda tecken:

1. I Partner Dashboard → Versions → Version_3
2. Ta bort alla Redirect URLs
3. Lägg till exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
4. Spara
5. Vänta 1-2 minuter
6. Testa OAuth igen

### Steg 5: Verifiera Client Secret Matchar

1. I Partner Dashboard → App setup → Client credentials
2. Kopiera **Client secret**
3. I Vercel Dashboard → Settings → Environment Variables
4. Verifiera att `SHOPIFY_API_SECRET` matchar exakt

## Vanliga Problem och Lösningar

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

### Problem 3: Version är inte Released
- **Symptom**: OAuth fungerar inte trots att allt ser korrekt ut
- **Lösning**: Publicera versionen (Release version)

### Problem 4: Scopes matchar inte
- **Partner Dashboard**: `read_orders,read_analytics`
- **OAuth URL**: `read_orders`
- **Lösning**: Uppdatera Partner Dashboard till bara `read_orders`

### Problem 5: Client ID har mellanslag
- **Vercel**: `SHOPIFY_API_KEY = " 67673cdd3c82f441029e0ec2381e99e6 "` (med mellanslag)
- **Lösning**: Ta bort alla mellanslag

## Snabb Checklista

- [ ] Redirect URI i Partner Dashboard är exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback` (ingen trailing slash)
- [ ] Redirect URI i OAuth URL matchar exakt (efter URL-decoding)
- [ ] Version är **Released** (inte bara Active)
- [ ] Scopes är exakt `read_orders` i både Partner Dashboard och Vercel
- [ ] Client ID matchar exakt: `67673cdd3c82f441029e0ec2381e99e6`
- [ ] Client Secret matchar mellan Partner Dashboard och Vercel
- [ ] Redirect URI har lagts till igen (för att säkerställa inga dolda tecken)
- [ ] Väntat 1-2 minuter efter ändringar

## Nästa Steg

1. **Kontrollera Vercel logs** för exakt OAuth URL
2. **Jämför Redirect URI** tecken för tecken med Partner Dashboard
3. **Verifiera att versionen är Released**
4. **Ta bort och lägg till Redirect URI igen** om det fortfarande inte fungerar

Om problemet kvarstår efter detta, kan det vara ett problem med Shopify's OAuth-tjänst eller en specifik shop-konfiguration. I så fall, testa med en annan shop.

