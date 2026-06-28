const {
  createToken,
  buildAuthCookie,
  clearAuthCookie,
  verifyTokenFromRequest,
  _parseCookies: parseCookies
} = require('../server/authService');

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'please-change-this-secret';

describe('createToken', () => {
  it('creates a valid JWT for a user with id', () => {
    const user = { id: 'user-123', email: 'test@example.com' };
    const token = createToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('user-123');
    expect(decoded.email).toBe('test@example.com');
  });

  it('creates a valid JWT for a user with _id (ObjectId-like)', () => {
    const user = { _id: { toString: () => 'obj-456' }, email: 'obj@example.com' };
    const token = createToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.userId).toBe('obj-456');
  });

  it('includes an expiration claim', () => {
    const user = { id: 'u1', email: 'e@e.com' };
    const token = createToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.exp).toBeDefined();
  });
});

describe('parseCookies', () => {
  it('parses a single cookie', () => {
    expect(parseCookies('name=value')).toEqual({ name: 'value' });
  });

  it('parses multiple cookies', () => {
    const result = parseCookies('a=1; b=2; c=3');
    expect(result).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({});
  });

  it('returns empty object for undefined', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('decodes URI-encoded values', () => {
    const result = parseCookies('token=hello%20world');
    expect(result.token).toBe('hello world');
  });

  it('handles cookies with = in value', () => {
    const result = parseCookies('token=abc=def=ghi');
    expect(result.token).toBe('abc=def=ghi');
  });
});

describe('buildAuthCookie', () => {
  it('builds a cookie string with the token', () => {
    const cookie = buildAuthCookie('mytoken123');
    expect(cookie).toContain('amertak_token=mytoken123');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
  });

  it('includes Max-Age', () => {
    const cookie = buildAuthCookie('t', 3600);
    expect(cookie).toContain('Max-Age=3600');
  });

  it('does not include Secure in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const cookie = buildAuthCookie('t');
    expect(cookie).not.toContain('Secure');
    process.env.NODE_ENV = originalEnv;
  });

  it('includes Secure in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const cookie = buildAuthCookie('t');
    expect(cookie).toContain('Secure');
    process.env.NODE_ENV = originalEnv;
  });

  it('defaults Max-Age to 7 days', () => {
    const cookie = buildAuthCookie('t');
    expect(cookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });
});

describe('clearAuthCookie', () => {
  it('sets Max-Age to 0', () => {
    const cookie = clearAuthCookie();
    expect(cookie).toContain('Max-Age=0');
  });

  it('clears the cookie value', () => {
    const cookie = clearAuthCookie();
    expect(cookie).toContain('amertak_token=;');
  });

  it('includes HttpOnly', () => {
    const cookie = clearAuthCookie();
    expect(cookie).toContain('HttpOnly');
  });
});

describe('verifyTokenFromRequest', () => {
  it('extracts token from Authorization header', () => {
    const user = { id: 'u1', email: 'e@e.com' };
    const token = createToken(user);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const result = verifyTokenFromRequest(req);
    expect(result.userId).toBe('u1');
    expect(result.email).toBe('e@e.com');
  });

  it('extracts token from cookie header', () => {
    const user = { id: 'u2', email: 'f@f.com' };
    const token = createToken(user);
    const req = { headers: { cookie: `amertak_token=${token}` } };
    const result = verifyTokenFromRequest(req);
    expect(result.userId).toBe('u2');
  });

  it('returns null when no token is present', () => {
    const req = { headers: {} };
    expect(verifyTokenFromRequest(req)).toBeNull();
  });

  it('returns null for invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    expect(verifyTokenFromRequest(req)).toBeNull();
  });

  it('prefers Authorization header over cookie', () => {
    const user1 = { id: 'header-user', email: 'h@h.com' };
    const user2 = { id: 'cookie-user', email: 'c@c.com' };
    const headerToken = createToken(user1);
    const cookieToken = createToken(user2);
    const req = {
      headers: {
        authorization: `Bearer ${headerToken}`,
        cookie: `amertak_token=${cookieToken}`
      }
    };
    const result = verifyTokenFromRequest(req);
    expect(result.userId).toBe('header-user');
  });

  it('returns null for expired token', () => {
    const token = jwt.sign({ userId: 'u', email: 'e' }, JWT_SECRET, { expiresIn: '0s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    // Wait a tick for expiration
    expect(verifyTokenFromRequest(req)).toBeNull();
  });
});
