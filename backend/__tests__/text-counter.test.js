const { _countText: countText } = require('../api/tools/text-counter');

describe('countText', () => {
  it('counts a simple sentence', () => {
    const result = countText('Hello world.');
    expect(result.words).toBe(2);
    expect(result.chars).toBe(12);
    expect(result.sentences).toBe(1);
    expect(result.paragraphs).toBe(1);
    expect(result.lines).toBe(1);
    expect(result.readingMinutes).toBe(1);
  });

  it('returns zeros for empty string', () => {
    const result = countText('');
    expect(result.words).toBe(0);
    expect(result.chars).toBe(0);
    expect(result.sentences).toBe(0);
    expect(result.paragraphs).toBe(0);
    expect(result.lines).toBe(0);
    expect(result.readingMinutes).toBe(0);
  });

  it('returns zeros for whitespace-only string', () => {
    const result = countText('   ');
    expect(result.words).toBe(0);
    expect(result.sentences).toBe(0);
    expect(result.paragraphs).toBe(0);
  });

  it('counts multiple sentences', () => {
    const result = countText('First sentence. Second sentence! Third?');
    expect(result.sentences).toBe(3);
  });

  it('counts multiple paragraphs', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const result = countText(text);
    expect(result.paragraphs).toBe(3);
  });

  it('counts lines correctly', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const result = countText(text);
    expect(result.lines).toBe(3);
  });

  it('counts words with multiple spaces', () => {
    const result = countText('hello   world   test');
    expect(result.words).toBe(3);
  });

  it('calculates reading minutes for longer texts', () => {
    const words = new Array(500).fill('word').join(' ');
    const result = countText(words);
    expect(result.words).toBe(500);
    expect(result.readingMinutes).toBe(3);
  });

  it('returns minimum 1 reading minute for non-empty text', () => {
    const result = countText('short');
    expect(result.readingMinutes).toBe(1);
  });

  it('counts characters including spaces', () => {
    const result = countText('a b c');
    expect(result.chars).toBe(5);
  });
});
