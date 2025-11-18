import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY?.trim().replace(/^["']|["']$/g, "");
const IV_LENGTH = 12; // AES-GCM recommended 96 bits

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not configured");
}

// Support both hex (as used by analytics platform) and base64 formats
let keyBuffer: Buffer;
if (/^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY)) {
  // Hex format (e.g., f1a2c3d4...)
  keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");
} else {
  // Base64 format
  keyBuffer = Buffer.from(ENCRYPTION_KEY, "base64");
}

if (![16, 24, 32].includes(keyBuffer.length)) {
  throw new Error(
    "ENCRYPTION_KEY must be a hex or base64 string representing a 128/192/256 bit key",
  );
}

export function encryptSecret(plain: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(`aes-${keyBuffer.length * 8}-gcm`, keyBuffer, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptSecret(payload: Buffer): string {
  try {
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = payload.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(`aes-${keyBuffer.length * 8}-gcm`, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unsupported state")) {
      throw new Error(
        "Token decryption failed: ENCRYPTION_KEY does not match the key used to encrypt the token. " +
        "Ensure ENCRYPTION_KEY is the same in both Shopify app and main platform."
      );
    }
    throw error;
  }
}
