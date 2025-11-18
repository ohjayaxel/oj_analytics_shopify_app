import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.trim().replace(/^["']|["']$/g, "");

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not configured");
}

// Support both hex and base64 formats
let keyBuffer: Buffer;
if (/^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
  keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
} else {
  keyBuffer = Buffer.from(ENCRYPTION_KEY, "base64");
}

/**
 * Normalizes a shop domain by removing protocol, www, and trailing slashes
 */
export function normalizeShopDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

/**
 * State data structure for OAuth
 */
export interface OAuthStateData {
  tenantId: string;
  shopDomain: string;
  timestamp: number;
  nonce: string;
}

/**
 * Validated state structure with signature
 */
export interface OAuthState {
  data: OAuthStateData;
  sig: string;
}

/**
 * Creates a signed OAuth state for Shopify OAuth flow
 */
export function createSignedState(stateData: OAuthStateData): string {
  const statePayload = JSON.stringify(stateData);
  const signature = crypto
    .createHmac("sha256", keyBuffer)
    .update(statePayload)
    .digest("hex");

  const state: OAuthState = {
    data: stateData,
    sig: signature,
  };

  return Buffer.from(JSON.stringify(state)).toString("base64");
}

/**
 * Validates and decodes OAuth state
 * @throws Error if validation fails
 */
export function validateAndDecodeState(state: string): OAuthStateData {
  try {
    // Decode base64
    const stateDecoded: OAuthState = JSON.parse(
      Buffer.from(state, "base64").toString("utf-8"),
    );

    if (!stateDecoded.data || !stateDecoded.sig) {
      throw new Error("Invalid state format: missing data or signature");
    }

    // Verify HMAC signature
    const statePayload = JSON.stringify(stateDecoded.data);
    const expectedSig = crypto
      .createHmac("sha256", keyBuffer)
      .update(statePayload)
      .digest("hex");

    if (stateDecoded.sig !== expectedSig) {
      throw new Error("State signature verification failed");
    }

    // Validate timestamp (max 10 minutes old)
    const stateAge = Date.now() - stateDecoded.data.timestamp;
    const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
    if (stateAge > MAX_AGE_MS) {
      throw new Error(`OAuth state expired (age: ${Math.floor(stateAge / 1000)}s)`);
    }

    if (stateAge < 0) {
      throw new Error("OAuth state has future timestamp");
    }

    return stateDecoded.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to decode state parameter");
  }
}

