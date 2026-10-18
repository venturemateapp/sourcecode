function splitDataUrl(value: string): { header: string; payload: string; isBase64: boolean } | null {
  if (!value.startsWith('data:')) return null;
  const comma = value.indexOf(',');
  if (comma < 0) return null;
  const header = value.slice(5, comma);
  return { header, payload: value.slice(comma + 1), isBase64: /;base64/i.test(header) };
}

function decodePrefix(payload: string, isBase64: boolean, maxBytes = 1024): Uint8Array | null {
  try {
    if (isBase64) {
      const clean = payload.replace(/\s/g, '');
      const chars = Math.max(4, Math.floor((maxBytes * 4) / 3 / 4) * 4);
      const binary = atob(clean.slice(0, chars));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return new TextEncoder().encode(decodeURIComponent(payload.slice(0, maxBytes)));
  } catch {
    return null;
  }
}

function mimeFromSignature(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  return null;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart();
  return head.startsWith('<svg') || head.includes('<svg');
}

// The AI sometimes labels raster payloads as image/svg+xml. Repoint the data
// URL to the real MIME type so browsers render it as an image instead of text.
export function normalizeImageSource(value: string): string {
  const trimmed = (value || '').trim();
  const data = splitDataUrl(trimmed);
  if (!data) return trimmed;
  const mime = data.header.split(';')[0].trim().toLowerCase();
  if (mime !== 'image/svg+xml') return trimmed;
  const bytes = decodePrefix(data.payload, data.isBase64);
  if (!bytes || looksLikeSvg(bytes)) return trimmed;
  const detected = mimeFromSignature(bytes);
  if (!detected) return trimmed;
  return `data:${detected};${data.isBase64 ? 'base64' : 'charset=utf-8'},${data.payload}`;
}

export function isInlineSvg(value: string): boolean {
  const trimmed = (value || '').trim();
  if (trimmed.startsWith('<svg')) return true;
  const data = splitDataUrl(trimmed);
  if (!data) return false;
  const mime = data.header.split(';')[0].trim().toLowerCase();
  if (mime !== 'image/svg+xml') return false;
  const bytes = decodePrefix(data.payload, data.isBase64);
  return bytes ? looksLikeSvg(bytes) : false;
}
