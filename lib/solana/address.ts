const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const BASE58_MAP = (() => {
  const map = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE58_ALPHABET.length; i += 1) {
    map[BASE58_ALPHABET.charCodeAt(i)] = i;
  }
  return map;
})();

/**
 * Decode Bitcoin/Solana base58. Returns null on invalid alphabet.
 * Leading `1`s become leading zero bytes.
 */
export function decodeBase58(input: string): Uint8Array | null {
  if (!input) {
    return null;
  }
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    const value = code < 128 ? BASE58_MAP[code] : -1;
    if (value == null || value < 0) {
      return null;
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j += 1) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < input.length && input[i] === "1"; i += 1) {
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

/** True when `input` is a 32-byte Solana pubkey in base58. */
export function isSolanaAddress(input: string): boolean {
  const s = input.trim();
  if (s.length < 32 || s.length > 44) {
    return false;
  }
  if (s.startsWith("0x") || s.startsWith("0X")) {
    return false;
  }
  const bytes = decodeBase58(s);
  return bytes != null && bytes.length === 32;
}

export function truncatePubkey(key: string, size = 4): string {
  const a = key.trim();
  if (a.length <= size * 2 + 1) {
    return a;
  }
  return `${a.slice(0, size)}…${a.slice(-size)}`;
}
