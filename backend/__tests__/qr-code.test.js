const { _clampNumber: clampNumber } = require('../api/tools/qr-code');

describe('clampNumber', () => {
  it('returns the value when within range', () => {
    expect(clampNumber(300, 100, 500, 200)).toBe(300);
  });

  it('clamps to min when value is below', () => {
    expect(clampNumber(50, 100, 500, 200)).toBe(100);
  });

  it('clamps to max when value is above', () => {
    expect(clampNumber(600, 100, 500, 200)).toBe(500);
  });

  it('returns fallback for NaN input', () => {
    expect(clampNumber('abc', 100, 500, 200)).toBe(200);
  });

  it('returns fallback for undefined', () => {
    expect(clampNumber(undefined, 100, 500, 200)).toBe(200);
  });

  it('treats null as 0 and clamps to min', () => {
    expect(clampNumber(null, 100, 500, 200)).toBe(100);
  });

  it('handles string number input', () => {
    expect(clampNumber('300', 100, 500, 200)).toBe(300);
  });

  it('handles exact min boundary', () => {
    expect(clampNumber(100, 100, 500, 200)).toBe(100);
  });

  it('handles exact max boundary', () => {
    expect(clampNumber(500, 100, 500, 200)).toBe(500);
  });

  it('handles zero as a valid value', () => {
    expect(clampNumber(0, 0, 8, 2)).toBe(0);
  });
});
