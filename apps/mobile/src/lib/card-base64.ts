// Keep PNG serialization independent of browser-only atob/btoa globals.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeCardBytes(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 8190) {
    let chunk = '';
    const end = Math.min(bytes.length, offset + 8190);
    for (let index = offset; index < end; index += 3) {
      const a = bytes[index]!;
      const b = bytes[index + 1] ?? 0;
      const c = bytes[index + 2] ?? 0;
      chunk += alphabet[a >> 2]! + alphabet[((a & 3) << 4) | (b >> 4)]!;
      chunk += index + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)]! : '=';
      chunk += index + 2 < bytes.length ? alphabet[c & 63]! : '=';
    }
    chunks.push(chunk);
  }
  return chunks.join('');
}

export function decodeCardBytes(base64: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(base64))
    throw new Error('Invalid PNG data.');
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((base64.length / 4) * 3 - padding);
  let offset = 0;
  for (let index = 0; index < base64.length; index += 4) {
    const a = alphabet.indexOf(base64[index]!);
    const b = alphabet.indexOf(base64[index + 1]!);
    const c = alphabet.indexOf(base64[index + 2]!);
    const d = alphabet.indexOf(base64[index + 3]!);
    bytes[offset++] = (a << 2) | (b >> 4);
    if (offset < bytes.length) bytes[offset++] = ((b & 15) << 4) | (c >> 2);
    if (offset < bytes.length) bytes[offset++] = ((c & 3) << 6) | d;
  }
  return bytes;
}
