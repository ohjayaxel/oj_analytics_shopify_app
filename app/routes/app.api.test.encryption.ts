import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { encryptSecret, decryptSecret } from "../../lib/encryption";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const testPlain = "test-token-12345";
    const encrypted = encryptSecret(testPlain);
    const decrypted = decryptSecret(encrypted);
    
    return json({
      success: decrypted === testPlain,
      test: {
        plain: testPlain,
        encryptedLength: encrypted.length,
        canDecrypt: decrypted === testPlain,
        decrypted: decrypted,
      },
    });
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
};
