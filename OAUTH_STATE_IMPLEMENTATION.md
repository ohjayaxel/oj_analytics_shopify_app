# OAuth State Implementation Guide för Huvudplattformen

Denna guide beskriver hur huvudplattformen ska implementera säker OAuth state-hantering för Shopify-integrationen.

## Översikt

Shopify-appen kräver nu en signerad state-parameter med HMAC-verifiering för att förhindra state-manipulation och säkerställa korrekt tenant-koppling.

## State-struktur

State-parametern ska innehålla:
- `tenantId`: Tenant ID från huvudplattformen
- `shopDomain`: Normaliserad shop domain (t.ex. "store.myshopify.com")
- `timestamp`: Unix timestamp i millisekunder
- `nonce`: Random hex string för unikhet
- `sig`: HMAC-SHA256 signatur över state-data

## Implementation

### 1. Skapa signerad state

```typescript
import { createHmac, randomBytes } from 'crypto';

// Använd samma ENCRYPTION_KEY som Shopify-appen
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // Hex format

function normalizeShopDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

export async function createShopifyOAuthState(options: {
  tenantId: string;
  shopDomain: string;
}): Promise<string> {
  // Normalisera shop domain
  const normalizedDomain = normalizeShopDomain(options.shopDomain);

  // Skapa state-data
  const stateData = {
    tenantId: options.tenantId,
    shopDomain: normalizedDomain,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString('hex')
  };

  // Signera state med HMAC-SHA256
  const statePayload = JSON.stringify(stateData);
  const signature = createHmac('sha256', Buffer.from(ENCRYPTION_KEY, 'hex'))
    .update(statePayload)
    .digest('hex');

  // Kombinera data + signatur
  const state: {
    data: typeof stateData;
    sig: string;
  } = {
    data: stateData,
    sig: signature
  };

  // Base64 encode
  return Buffer.from(JSON.stringify(state)).toString('base64');
}
```

### 2. Använd state i OAuth URL

```typescript
export async function getShopifyAuthorizeUrl(options: {
  tenantId: string;
  shopDomain: string;
}): Promise<string> {
  const state = await createShopifyOAuthState({
    tenantId: options.tenantId,
    shopDomain: options.shopDomain
  });

  const normalizedDomain = normalizeShopDomain(options.shopDomain);
  
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY!,
    scope: 'read_orders',
    redirect_uri: process.env.SHOPIFY_OAUTH_REDIRECT_URI!,
    state,
  });

  return `https://${normalizedDomain}/admin/oauth/authorize?${params.toString()}`;
}
```

### 3. Validering i callback (valfritt)

Huvudplattformen kan också validera state när användaren redirectas tillbaka:

```typescript
export function validateShopifyOAuthState(state: string): {
  tenantId: string;
  shopDomain: string;
} {
  try {
    const stateDecoded: {
      data: {
        tenantId: string;
        shopDomain: string;
        timestamp: number;
        nonce: string;
      };
      sig: string;
    } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

    if (!stateDecoded.data || !stateDecoded.sig) {
      throw new Error('Invalid state format');
    }

    // Verifiera signatur
    const statePayload = JSON.stringify(stateDecoded.data);
    const expectedSig = createHmac('sha256', Buffer.from(ENCRYPTION_KEY, 'hex'))
      .update(statePayload)
      .digest('hex');

    if (stateDecoded.sig !== expectedSig) {
      throw new Error('State signature verification failed');
    }

    // Validera timestamp (max 10 minuter)
    const stateAge = Date.now() - stateDecoded.data.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      throw new Error('OAuth state expired');
    }

    return {
      tenantId: stateDecoded.data.tenantId,
      shopDomain: stateDecoded.data.shopDomain
    };
  } catch (error) {
    throw new Error(`State validation failed: ${error.message}`);
  }
}
```

## Säkerhetsaspekter

1. **HMAC-signatur**: Förhindrar state-manipulation
2. **Timestamp-validering**: State är bara giltig i 10 minuter
3. **Shop domain matchning**: Shopify-appen verifierar att shop domain i state matchar faktisk shop
4. **Unikhet**: Nonce säkerställer att varje state är unik
5. **Normalisering**: Shop domain normaliseras konsekvent för att undvika matchningsfel

## Felhantering

Shopify-appen returnerar följande fel i redirect URL:

- `error=missing_state`: State-parameter saknas
- `error=invalid_state`: State-validering misslyckades (signatur, format, etc.)
- `error=shop_mismatch`: Shop domain matchar inte state
- `error=shop_already_connected`: Shop är redan kopplad till annan tenant
- `error=oauth_failed`: Allmänt OAuth-fel

Huvudplattformen bör hantera dessa fel och visa lämpliga meddelanden till användaren.

## Exempel: Fullständig OAuth-flow

```typescript
// 1. Initiera OAuth
async function connectShopifyStore(tenantId: string, shopDomain: string) {
  const state = await createShopifyOAuthState({ tenantId, shopDomain });
  const authUrl = await getShopifyAuthorizeUrl({ tenantId, shopDomain });
  
  // Redirect användare till authUrl
  window.location.href = authUrl;
}

// 2. Hantera callback
async function handleShopifyCallback(url: URL) {
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    // Hantera fel
    console.error('OAuth error:', error);
    return;
  }

  if (state && code) {
    // Validera state (valfritt, Shopify-appen gör också detta)
    const validated = validateShopifyOAuthState(state);
    
    // State är giltig, Shopify-appen har redan sparat connection
    // Huvudplattformen kan nu visa success-meddelande
    console.log('Connected:', validated.tenantId, validated.shopDomain);
  }
}
```

## Viktigt

- **ENCRYPTION_KEY måste vara samma** i både huvudplattformen och Shopify-appen
- **Shop domain måste normaliseras** på samma sätt i båda apparna
- **State är bara giltig i 10 minuter** - användare måste slutföra OAuth inom denna tid
- **Shop kan bara kopplas till en tenant** - Shopify-appen blockerar dubbletter

