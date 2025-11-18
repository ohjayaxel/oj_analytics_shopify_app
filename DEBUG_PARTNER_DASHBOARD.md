# Debug: Partner Dashboard Konfiguration

Konfigurationen ser korrekt ut, men OAuth fungerar fortfarande inte. Låt oss kontrollera några saker:

## ✅ Vad som är korrekt

- Redirect URLs: `["https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback"]` ✅
- Scopes: `read_orders` ✅
- Embed app in Shopify admin: `true` ✅
- API version: `2025-10` ✅
- Status: Active ✅

## 🔍 Saker att kontrollera

### 1. Är appen Released?

I Partner Dashboard:
1. Gå till **Versions** → **Version_2**
2. Kontrollera status:
   - **Active** ✅ (du har detta)
   - **Released** - Måste också vara Released, inte "Draft" eller "Unreleased"

Om appen inte är Released:
- Klicka på **"Release version"** eller **"Publish"**
- Vänta några minuter för att ändringarna ska propagera

### 2. Kontrollera App Distribution

1. Gå till **App setup** → **Distribution**
2. Kontrollera:
   - **App distribution**: App Store eller Custom (båda fungerar)
   - **App status**: Active

### 3. Testa med en annan shop

Om du testar med en dev store (`sandboxstorefront.myshopify.com`), testa också med:
- En annan dev store
- Eller vänta några minuter efter att ha publicerat versionen

### 4. Kontrollera Redirect URI exakt matchning

Även om det ser korrekt ut, kan det finnas dolda tecken:

1. I Partner Dashboard, klicka på **"Edit"** för Redirect URLs
2. Ta bort alla Redirect URLs
3. Lägg till exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`
4. Spara
5. Vänta 1-2 minuter
6. Testa OAuth igen

### 5. Kontrollera Client Secret

1. Gå till **App setup** → **Client credentials**
2. Verifiera att **Client secret** matchar `SHOPIFY_API_SECRET` i Vercel
3. Om de inte matchar, uppdatera Vercel environment variable

### 6. Testa OAuth URL direkt

Kopiera OAuth URL:en från Vercel logs och öppna den direkt i en inkognito-webbläsare:

```
https://sandboxstorefront.myshopify.com/admin/oauth/authorize?client_id=67673cdd3c82f441029e0ec2381e99e6&scope=read_orders&redirect_uri=https%3A%2F%2Fohjay-dashboard.vercel.app%2Fapi%2Foauth%2Fshopify%2Fcallback&state=...
```

Om du fortfarande får "accounts.shopify.com avvisade anslutningen", är problemet definitivt i Partner Dashboard-konfigurationen.

## 🚨 Vanliga problem

### Problem 1: Appen är inte Released
- **Symptom**: OAuth fungerar inte trots att allt ser korrekt ut
- **Lösning**: Publicera appen (Release version)

### Problem 2: Redirect URI har dolda tecken
- **Symptom**: OAuth fungerar inte trots att Redirect URI ser korrekt ut
- **Lösning**: Ta bort och lägg till Redirect URI igen

### Problem 3: Appen är inte aktiverad för dev stores
- **Symptom**: OAuth fungerar inte med dev stores
- **Lösning**: Kontrollera App Distribution-inställningar

### Problem 4: Client Secret matchar inte
- **Symptom**: OAuth fungerar inte
- **Lösning**: Verifiera att `SHOPIFY_API_SECRET` i Vercel matchar Partner Dashboard

## 📋 Snabb checklista

- [ ] Appen är **Released** (inte bara Active)
- [ ] Redirect URI är exakt: `https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback` (ingen trailing slash)
- [ ] Redirect URI har lagts till igen (för att säkerställa inga dolda tecken)
- [ ] Väntat 1-2 minuter efter att ha ändrat Redirect URI
- [ ] Client Secret matchar mellan Partner Dashboard och Vercel
- [ ] Testat med en annan shop (eller väntat efter publicering)

## 🎯 Nästa steg

1. **Kontrollera om appen är Released** - Detta är den vanligaste orsaken
2. **Ta bort och lägg till Redirect URI igen** - För att säkerställa inga dolda tecken
3. **Vänta 1-2 minuter** - Ändringar kan ta tid att propagera
4. **Testa OAuth igen**

Om problemet kvarstår efter detta, kan det vara ett problem med Shopify's OAuth-tjänst eller en specifik shop-konfiguration.

