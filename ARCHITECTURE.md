# Shopify App Architecture

## Två möjliga arkitekturer

Det finns två sätt att implementera OAuth-flödet:

### Arkitektur A: OAuth callback i Shopify-appen (Nuvarande implementation)

**Flöde:**
1. Huvudplattformen initierar OAuth med signerad state-parameter
2. Shopify redirectar tillbaka till Shopify-appen (`/app/auth/oauth/callback`)
3. Shopify-appen validerar state, sparar connection i Supabase
4. Shopify-appen redirectar tillbaka till huvudplattformen

**Fördelar:**
- All OAuth-logik på ett ställe (Shopify-appen)
- Enklare för huvudplattformen (bara initiera OAuth)

**Nackdelar:**
- Kräver tenant-val i state-parameter (inte visuell UI)

**Filer:**
- `app/routes/app.auth.oauth.callback.ts` - OAuth callback handler
- `app/routes/auth.$.tsx` - Alternativ OAuth callback route

### Arkitektur B: OAuth callback i huvudplattformen (Enligt guide)

**Flöde:**
1. Användaren öppnar Shopify-appen → `/app/connect`
2. Shopify-appen visar tenant-dropdown
3. Användaren väljer tenant och klickar "Connect"
4. Shopify-appen anropar huvudplattformens API för att få OAuth URL
5. Shopify redirectar till OAuth URL (från huvudplattformen)
6. Shopify redirectar tillbaka till huvudplattformens callback
7. Huvudplattformen hanterar OAuth och sparar connection

**Fördelar:**
- Visuell tenant-val UI i Shopify-appen
- OAuth callback i huvudplattformen (mer kontroll)

**Nackdelar:**
- Kräver API-endpoints i huvudplattformen (`/api/shopify/tenants`, `/api/shopify/oauth/init`)
- Mer komplex setup

**Filer:**
- `app/routes/app.connect.tsx` - Tenant-val UI
- OAuth callback routes i Shopify-appen används INTE

## Nuvarande status

**Båda arkitekturerna är implementerade:**

1. ✅ **Arkitektur A** - OAuth callback i Shopify-appen
   - `app/routes/app.auth.oauth.callback.ts`
   - `app/routes/auth.$.tsx`
   - Signerad state-validering med HMAC

2. ✅ **Arkitektur B** - Tenant-val UI
   - `app/routes/app.connect.tsx`
   - Hämtar tenants från huvudplattformens API
   - Initierar OAuth via huvudplattformens API

## Välj arkitektur

### Om du vill använda Arkitektur A (OAuth callback i Shopify-appen):

1. **Huvudplattformen behöver:**
   - Implementera signerad state-parameter (se `OAUTH_STATE_IMPLEMENTATION.md`)
   - Initiera OAuth med state som innehåller `tenantId` och `shopDomain`

2. **Shopify-appen:**
   - OAuth callback routes är aktiva
   - `/app/connect` kan användas som alternativ, men OAuth callback fungerar också direkt

### Om du vill använda Arkitektur B (OAuth callback i huvudplattformen):

1. **Huvudplattformen behöver:**
   - Implementera `/api/shopify/tenants` endpoint (returnerar tillgängliga tenants)
   - Implementera `/api/shopify/oauth/init` endpoint (skapar OAuth URL med tenant)
   - Implementera `/api/oauth/shopify/callback` endpoint (hanterar OAuth callback)

2. **Shopify-appen:**
   - OAuth callback routes (`app.auth.oauth.callback.ts`, `auth.$.tsx`) ska INTE användas
   - `/app/connect` är huvudflödet
   - Kommentera ut eller ta bort OAuth callback routes

## Rekommendation

**Använd Arkitektur A** om:
- Du vill ha enklare setup
- OAuth callback-logik ska vara i Shopify-appen
- Du är OK med att tenant väljs i state-parameter

**Använd Arkitektur B** om:
- Du vill ha visuell tenant-val UI i Shopify-appen
- Du vill ha full kontroll över OAuth callback i huvudplattformen
- Du redan har API-endpoints i huvudplattformen

## Hybrid-approach (Båda)

Du kan också använda båda:
- `/app/connect` för första gången (visuell tenant-val)
- Direkt OAuth från huvudplattformen för re-connection (med state-parameter)

I detta fall fungerar båda OAuth callback routes och `/app/connect`.

