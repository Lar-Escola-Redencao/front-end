export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}


export function isJwtInvalid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return true;
  }
  if (!payload.exp) {
    return false;
  }
  return Date.now() >= payload.exp * 1000;
}
