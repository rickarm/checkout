const { Entry, loadTemplate } = require('../lib/core/entry');

describe('Entry', () => {
  test('creates entry with default template', () => {
    const entry = new Entry();
    expect(entry.templateId).toBe('checkout-v1');
    expect(entry.answers).toEqual({});
  });

  test('sets and retrieves answers', () => {
    const entry = new Entry();
    entry.setAnswer('presence', '7');
    expect(entry.getAnswer('presence')).toBe('7');
  });

  test('validates required questions', () => {
    const entry = new Entry();
    const result = entry.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validates presence range', () => {
    const entry = new Entry();
    entry.setAnswer('presence', '11');
    entry.setAnswer('joy', 'test');
    entry.setAnswer('values', 'test');
    const result = entry.validate();
    expect(result.valid).toBe(false);
  });

  test('generates metadata', () => {
    const entry = new Entry();
    const meta = entry.getMetadata();
    expect(meta.template).toBe('checkout-v1');
    expect(meta.version).toBe('1.0');
  });
});
