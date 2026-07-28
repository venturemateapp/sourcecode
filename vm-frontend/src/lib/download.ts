import { getToken } from './auth';

export function saveBlob(blob: Blob, fileName: string) {
  if (!blob.size) throw new Error('The downloaded file is empty.');
  const objectURL = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectURL;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel downloads in Safari and some Chromium
  // configurations. Keep the object URL alive until the click is consumed.
  window.setTimeout(() => URL.revokeObjectURL(objectURL), 30_000);
}

function responseFileName(response: Response, fallback: string) {
  const disposition = response.headers.get('content-disposition') || '';
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const value = utf8 || plain;
  if (!value) return fallback;
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function downloadFile(url: string, fallbackFileName: string) {
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Download failed with HTTP ${response.status}.`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.startsWith('text/')) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'The server returned an error instead of a file.');
  }
  const blob = await response.blob();
  saveBlob(blob, responseFileName(response, fallbackFileName));
}
