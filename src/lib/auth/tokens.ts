/**
 * Web Crypto token helpers shared by middleware (Edge) and route handlers
 * (Node). Uses only `globalThis.crypto` and `btoa`, both available in every
 * Next.js runtime, so no Node-only import leaks into Edge code.
 */

/** Generate a URL-safe, unguessable random token (default 256 bits). */
export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  let binary = '';
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Length-checked constant-time string comparison. Used for the CSRF
 * double-submit check; returns false for any length mismatch without leaking
 * timing about the matching prefix.
 */
export function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
