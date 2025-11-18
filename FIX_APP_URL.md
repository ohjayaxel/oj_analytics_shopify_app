# Fix: App URL - "Example Domain"

## Problem

App URL är satt till `https://example.com` vilket är en placeholder. Detta gör att appen redirectar till "Example Domain" istället för Shopify-appen.

## Lösning

### Steg 1: Hämta Tunnel-URL från Shopify CLI

När du kör `shopify app dev`, kommer Shopify CLI att visa en tunnel-URL, t.ex.:
```
https://permalink-frog-series-initially.trycloudflare.com
```

### Steg 2: Uppdatera App URL i Partner Dashboard

1. Gå till [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Välj appen **"OJ Analytics"**
3. Gå till **Versions** → **Version_2** (eller skapa Version_3)
4. Under **App URL**, uppdatera till tunnel-URL:en från steg 1:
   ```
   https://permalink-frog-series-initially.trycloudflare.com
   ```
5. Spara och vänta 1-2 minuter

### Steg 3: Alternativ - Använd `automatically_update_urls_on_dev`

`shopify.app.toml` har redan:
```toml
[build]
automatically_update_urls_on_dev = true
```

Detta betyder att Shopify CLI automatiskt kan uppdatera App URL när du kör `shopify app dev`. Men du kan behöva:

1. Kör `shopify app dev` igen
2. Kolla om App URL uppdateras automatiskt i Partner Dashboard
3. Om inte, uppdatera manuellt enligt Steg 2

### Steg 4: För Produktion

När du deployar appen till produktion, uppdatera App URL till produktions-URL:en (t.ex. Vercel deployment URL).

## Snabb Fix

1. **Kör `shopify app dev`** och kopiera tunnel-URL:en
2. **Uppdatera App URL i Partner Dashboard** till tunnel-URL:en
3. **Vänta 1-2 minuter** för att ändringarna ska propagera
4. **Testa appen igen**

## Notering

- **App URL** = Var Shopify-appen är hostad (tunnel-URL under utveckling, produktions-URL i produktion)
- **Redirect URI** = Var OAuth callback är (`https://ohjay-dashboard.vercel.app/api/oauth/shopify/callback`)

Dessa är två olika saker:
- App URL pekar på Shopify-appen själv
- Redirect URI pekar på huvudplattformens OAuth callback

