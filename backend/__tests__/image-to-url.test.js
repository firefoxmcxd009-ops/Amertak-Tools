const {
  _generateShortId: generateShortId,
  _getBaseUrl: getBaseUrl,
  _getSubPath: getSubPath
} = require('../api/tools/image-to-url');

describe('generateShortId', () => {
  it('returns a string', () => {
    expect(typeof generateShortId()).toBe('string');
  });

  it('returns a non-empty string', () => {
    expect(generateShortId().length).toBeGreaterThan(0);
  });

  it('returns different values on successive calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateShortId()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('getBaseUrl', () => {
  it('uses BASE_URL env var when set', () => {
    const originalBase = process.env.BASE_URL;
    process.env.BASE_URL = 'https://custom.api.com/';
    const req = { headers: { host: 'other.com' }, protocol: 'http' };
    expect(getBaseUrl(req)).toBe('https://custom.api.com');
    process.env.BASE_URL = originalBase;
  });

  it('strips trailing slash from BASE_URL', () => {
    const originalBase = process.env.BASE_URL;
    process.env.BASE_URL = 'https://example.com/';
    const req = { headers: {} };
    expect(getBaseUrl(req)).toBe('https://example.com');
    process.env.BASE_URL = originalBase;
  });

  it('constructs URL from host header when no BASE_URL', () => {
    const originalBase = process.env.BASE_URL;
    delete process.env.BASE_URL;
    const req = {
      headers: { host: 'myapi.com' },
      protocol: 'https'
    };
    expect(getBaseUrl(req)).toBe('https://myapi.com');
    process.env.BASE_URL = originalBase;
  });

  it('uses x-forwarded-proto and x-forwarded-host', () => {
    const originalBase = process.env.BASE_URL;
    delete process.env.BASE_URL;
    const req = {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'proxy.com'
      },
      protocol: 'http'
    };
    expect(getBaseUrl(req)).toBe('https://proxy.com');
    process.env.BASE_URL = originalBase;
  });

  it('falls back to default vercel URL', () => {
    const originalBase = process.env.BASE_URL;
    delete process.env.BASE_URL;
    const req = { headers: {} };
    expect(getBaseUrl(req)).toBe('https://amertak-tools.vercel.app');
    process.env.BASE_URL = originalBase;
  });
});

describe('getSubPath', () => {
  it('extracts sub-path after /api/tools/image-to-url', () => {
    const req = { originalUrl: '/api/tools/image-to-url/image/abc123' };
    expect(getSubPath(req)).toBe('/image/abc123');
  });

  it('returns / for the root route', () => {
    const req = { originalUrl: '/api/tools/image-to-url' };
    expect(getSubPath(req)).toBe('/');
  });

  it('falls back to req.url', () => {
    const req = { url: '/api/tools/image-to-url/image/xyz' };
    expect(getSubPath(req)).toBe('/image/xyz');
  });

  it('returns / when no matching path', () => {
    const req = { originalUrl: '/' };
    expect(getSubPath(req)).toBe('/');
  });
});
