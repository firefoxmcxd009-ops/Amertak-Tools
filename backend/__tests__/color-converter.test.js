const {
  _normalizeHex: normalizeHex,
  _hexToRgb: hexToRgb,
  _rgbToHsl: rgbToHsl,
  _rgbToHsv: rgbToHsv
} = require('../api/tools/color-converter');

describe('normalizeHex', () => {
  it('accepts a 6-char hex with hash', () => {
    expect(normalizeHex('#ff0000')).toBe('#ff0000');
  });

  it('accepts a 6-char hex without hash', () => {
    expect(normalizeHex('00ff00')).toBe('#00ff00');
  });

  it('expands a 3-char shorthand hex', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('expands a 3-char shorthand hex without hash', () => {
    expect(normalizeHex('f0f')).toBe('#ff00ff');
  });

  it('lowercases hex characters', () => {
    expect(normalizeHex('#AABB00')).toBe('#aabb00');
  });

  it('returns null for invalid hex', () => {
    expect(normalizeHex('xyz')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex(null)).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });

  it('returns null for wrong-length values', () => {
    expect(normalizeHex('#abcde')).toBeNull();
    expect(normalizeHex('#ab')).toBeNull();
    expect(normalizeHex('#abcdefg')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(normalizeHex('  #ff0000  ')).toBe('#ff0000');
  });
});

describe('hexToRgb', () => {
  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts white', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts red', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('converts green', () => {
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('converts blue', () => {
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts an arbitrary color', () => {
    expect(hexToRgb('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60 });
  });
});

describe('rgbToHsl', () => {
  it('converts black', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
  });

  it('converts white', () => {
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
  });

  it('converts pure red', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
  });

  it('converts pure green', () => {
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 });
  });

  it('converts pure blue', () => {
    expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, l: 50 });
  });

  it('converts a mid-gray', () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 });
  });
});

describe('rgbToHsv', () => {
  it('converts black', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('converts white', () => {
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 100 });
  });

  it('converts pure red', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 });
  });

  it('converts pure green', () => {
    expect(rgbToHsv({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, v: 100 });
  });

  it('converts pure blue', () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 255 })).toEqual({ h: 240, s: 100, v: 100 });
  });

  it('converts yellow', () => {
    expect(rgbToHsv({ r: 255, g: 255, b: 0 })).toEqual({ h: 60, s: 100, v: 100 });
  });
});
