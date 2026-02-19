import { supabase } from "@/integrations/supabase/client";

// AES-GCM encryption utilities for E2EE messaging

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const ENCRYPTED_PREFIX = "🔒:"; // Prefix to identify encrypted messages

// Generate a random AES key and export as base64
async function generateKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import a base64 key string into a CryptoKey
async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Encrypt plaintext → "🔒:<base64(iv+ciphertext)>"
export async function encryptMessage(
  plaintext: string,
  base64Key: string
): Promise<string> {
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded
  );

  // Combine IV + ciphertext into one buffer
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return ENCRYPTED_PREFIX + btoa(String.fromCharCode(...combined));
}

// Decrypt "🔒:<base64>" → plaintext
export async function decryptMessage(
  encrypted: string,
  base64Key: string
): Promise<string> {
  if (!encrypted.startsWith(ENCRYPTED_PREFIX)) return encrypted;

  try {
    const key = await importKey(base64Key);
    const data = encrypted.slice(ENCRYPTED_PREFIX.length);
    const combined = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn("[E2EE] Decryption failed:", e);
    return "🔒 Unable to decrypt message";
  }
}

export function isEncrypted(content: string | null): boolean {
  return !!content && content.startsWith(ENCRYPTED_PREFIX);
}

// In-memory key cache to avoid repeated DB lookups
const keyCache = new Map<string, string>();

// Get or create the encryption key for a conversation
export async function getConversationKey(
  conversationId: string
): Promise<string> {
  // Check cache
  const cached = keyCache.get(conversationId);
  if (cached) return cached;

  // Try to fetch from DB
  const { data } = await (supabase.from("conversation_keys") as any)
    .select("encryption_key")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (data?.encryption_key) {
    keyCache.set(conversationId, data.encryption_key);
    return data.encryption_key;
  }

  // Generate a new key and store it
  const newKey = await generateKey();
  await (supabase.from("conversation_keys") as any).insert({
    conversation_id: conversationId,
    encryption_key: newKey,
  });

  keyCache.set(conversationId, newKey);
  return newKey;
}
