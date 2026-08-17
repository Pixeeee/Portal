import { isPortalCode, normalizePortalCode } from '@portal/contracts';

export function portalCodeFromScan(data: string): string | null {
  const value = data.trim();
  const candidates = [value];

  try {
    const url = new URL(value);
    const queryCode = url.searchParams.get('code');
    if (queryCode) candidates.unshift(queryCode);
    const lastPathSegment = url.pathname.split('/').filter(Boolean).at(-1);
    if (lastPathSegment) candidates.push(lastPathSegment);
  } catch {
    const queryCode = value.match(/[?&]code=([^&]+)/i)?.[1];
    if (queryCode) candidates.unshift(decodeURIComponent(queryCode));
  }

  for (const candidate of candidates) {
    const code = normalizePortalCode(decodeURIComponent(candidate));
    if (isPortalCode(code)) return code;
  }
  return null;
}
