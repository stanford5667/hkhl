// Encryption utilities for sensitive data storage
// Uses AES-256-GCM for authenticated encryption

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits

/**
 * Encrypts a string value using AES-256-GCM.
 * Returns a base64-encoded string containing iv + ciphertext + tag
 */
export async function encrypt(plaintext: string, keyHex?: string): Promise<string> {
  const encryptionKey = keyHex || Deno.env.get('ENCRYPTION_KEY');
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Import the key
  const keyBytes = hexToBytes(encryptionKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  // Encrypt
  const encodedPlaintext = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encodedPlaintext
  );

  // Combine IV and ciphertext (tag is appended to ciphertext in WebCrypto)
  const ciphertextArray = new Uint8Array(ciphertext);
  const combined = new Uint8Array(iv.length + ciphertextArray.length);
  combined.set(iv, 0);
  combined.set(ciphertextArray, iv.length);

  return bytesToBase64(combined);
}

/**
 * Decrypts a base64-encoded encrypted string.
 */
export async function decrypt(encryptedBase64: string, keyHex?: string): Promise<string> {
  const encryptionKey = keyHex || Deno.env.get('ENCRYPTION_KEY');
  
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  // Import the key
  const keyBytes = hexToBytes(encryptionKey);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['decrypt']
  );

  // Decode and split IV from ciphertext
  const combined = base64ToBytes(encryptedBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generates a new random encryption key (256 bits as hex string).
 */
export function generateEncryptionKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(keyBytes);
}

// Helper functions
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
