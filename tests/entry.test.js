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

  test('validates required questions', async () => {
    const entry = new Entry();
    const result = await entry.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('validates presence range', async () => {
    const entry = new Entry();
    entry.setAnswer('presence', '11');
    entry.setAnswer('joy', 'test');
    entry.setAnswer('values', 'test');
    const result = await entry.validate();
    expect(result.valid).toBe(false);
  });

  test('generates metadata', () => {
    const entry = new Entry();
    const meta = entry.getMetadata();
    expect(meta.template).toBe('checkout-v1');
    expect(meta.version).toBe('1.0');
  });

  test('leela template validates correctly', async () => {
    const entry = new Entry('leela-v1');
    // feeling and joy are required
    entry.setAnswer('feeling', '4');
    entry.setAnswer('joy', 'Had a great day at school');
    const result = await entry.validate();
    expect(result.valid).toBe(true);
  });

  test('leela template rejects out-of-range feeling', async () => {
    const entry = new Entry('leela-v1');
    entry.setAnswer('feeling', '9');
    entry.setAnswer('joy', 'Great day');
    const result = await entry.validate();
    expect(result.valid).toBe(false);
  });
});
