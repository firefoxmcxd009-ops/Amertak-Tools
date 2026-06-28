const {
  _isValidUrl: isValidUrl,
  _formatBytes: formatBytes,
  _normalizeFormat: normalizeFormat,
  _normalizePayload: normalizePayload
} = require('../api/tools/downloader');

describe('isValidUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts https URLs', () => {
    expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('rejects ftp URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('rejects javascript protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('formatBytes', () => {
  it('returns a positive finite number as-is', () => {
    expect(formatBytes(1024)).toBe(1024);
  });

  it('returns null for zero', () => {
    expect(formatBytes(0)).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(formatBytes(-5)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(formatBytes('not a number')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatBytes(undefined)).toBeNull();
  });

  it('parses string numbers', () => {
    expect(formatBytes('500')).toBe(500);
  });

  it('returns null for Infinity', () => {
    expect(formatBytes(Infinity)).toBeNull();
  });
});

describe('normalizeFormat', () => {
  it('returns null when format has no url', () => {
    expect(normalizeFormat({ ext: 'mp4' })).toBeNull();
  });

  it('normalizes a video+audio format', () => {
    const result = normalizeFormat({
      url: 'https://example.com/video.mp4',
      vcodec: 'h264',
      acodec: 'aac',
      ext: 'mp4',
      height: 720,
      fps: 30,
      filesize: 5000
    });
    expect(result).toEqual({
      url: 'https://example.com/video.mp4',
      quality: expect.stringContaining('720p'),
      type: 'video',
      extension: 'mp4',
      size: 5000
    });
  });

  it('identifies video-only format', () => {
    const result = normalizeFormat({
      url: 'https://example.com/video.mp4',
      vcodec: 'h264',
      acodec: 'none',
      ext: 'mp4'
    });
    expect(result.type).toBe('video only');
  });

  it('identifies audio-only format', () => {
    const result = normalizeFormat({
      url: 'https://example.com/audio.m4a',
      vcodec: 'none',
      acodec: 'aac',
      ext: 'm4a'
    });
    expect(result.type).toBe('audio');
  });

  it('falls back to fragment_base_url', () => {
    const result = normalizeFormat({
      fragment_base_url: 'https://example.com/frag',
      ext: 'mp4'
    });
    expect(result.url).toBe('https://example.com/frag');
  });

  it('defaults extension to media', () => {
    const result = normalizeFormat({ url: 'https://example.com/file' });
    expect(result.extension).toBe('media');
  });
});

describe('normalizePayload', () => {
  it('extracts formats from payload', () => {
    const payload = {
      title: 'Test Video',
      uploader: 'TestUser',
      thumbnail: 'https://example.com/thumb.jpg',
      extractor_key: 'YouTube',
      duration: 120,
      formats: [
        { url: 'https://example.com/v1.mp4', vcodec: 'h264', acodec: 'aac', ext: 'mp4' },
        { url: 'https://example.com/v2.mp4', vcodec: 'h264', acodec: 'aac', ext: 'mp4' }
      ]
    };
    const result = normalizePayload(payload);
    expect(result.success).toBe(true);
    expect(result.title).toBe('Test Video');
    expect(result.author).toBe('TestUser');
    expect(result.medias).toHaveLength(2);
  });

  it('deduplicates formats by URL', () => {
    const payload = {
      formats: [
        { url: 'https://example.com/same.mp4', ext: 'mp4' },
        { url: 'https://example.com/same.mp4', ext: 'mp4' }
      ]
    };
    const result = normalizePayload(payload);
    expect(result.medias).toHaveLength(1);
  });

  it('falls back to payload.url when formats is empty', () => {
    const payload = {
      url: 'https://example.com/fallback.mp4',
      title: 'Fallback',
      ext: 'mp4',
      vcodec: 'h264',
      formats: []
    };
    const result = normalizePayload(payload);
    expect(result.medias).toHaveLength(1);
    expect(result.medias[0].url).toBe('https://example.com/fallback.mp4');
  });

  it('limits formats to 24', () => {
    const formats = Array.from({ length: 30 }, (_, i) => ({
      url: `https://example.com/format${i}.mp4`,
      ext: 'mp4'
    }));
    const result = normalizePayload({ formats });
    expect(result.medias.length).toBeLessThanOrEqual(24);
  });

  it('defaults title to Untitled', () => {
    const result = normalizePayload({ formats: [] });
    expect(result.title).toBe('Untitled');
  });

  it('defaults author to Unknown', () => {
    const result = normalizePayload({ formats: [] });
    expect(result.author).toBe('Unknown');
  });

  it('includes supportedPlatforms', () => {
    const result = normalizePayload({ formats: [] });
    expect(Array.isArray(result.supportedPlatforms)).toBe(true);
    expect(result.supportedPlatforms).toContain('YouTube');
  });
});
