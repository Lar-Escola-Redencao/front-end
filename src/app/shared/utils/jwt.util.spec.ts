import { decodeJwtPayload, isJwtInvalid } from './jwt.util';

function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(payload: unknown): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed token payload', () => {
    const token = buildToken({ sub: 'user-1', exp: 9999999999 });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', exp: 9999999999 });
  });

  it('returns null when the token does not have three segments', () => {
    expect(decodeJwtPayload('only.two')).toBeNull();
  });

  it('returns null when the payload segment is not valid base64/JSON (tampered token)', () => {
    const token = buildToken({ sub: 'user-1' });
    const [header, , signature] = token.split('.');
    const tamperedPayload = 'not-a-valid-base64-json-payload!!!';
    expect(decodeJwtPayload(`${header}.${tamperedPayload}.${signature}`)).toBeNull();
  });
});

describe('isJwtInvalid', () => {
  it('returns false for a token that has not expired yet', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isJwtInvalid(token)).toBe(false);
  });

  it('returns true for a token past its exp', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(isJwtInvalid(token)).toBe(true);
  });

  it('returns false for a valid token that carries no exp claim', () => {
    const token = buildToken({ sub: 'user-1' });
    expect(isJwtInvalid(token)).toBe(false);
  });

  it('returns true for a tampered token whose payload cannot be decoded', () => {
    const token = buildToken({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 });
    const [header, , signature] = token.split('.');
    const tamperedPayload = 'not-a-valid-base64-json-payload!!!';
    expect(isJwtInvalid(`${header}.${tamperedPayload}.${signature}`)).toBe(true);
  });

  it('returns true for a malformed token with the wrong number of segments', () => {
    expect(isJwtInvalid('not-a-jwt')).toBe(true);
  });
});
