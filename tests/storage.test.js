const { validateFilename, getEntryPath } = require('../lib/core/storage');
const path = require('path');

describe('Storage', () => {
  test('validates correct filename', () => {
    const result = validateFilename('2026-02-12-checkout-v1.md');
    expect(result.valid).toBe(true);
  });

  test('rejects invalid filename', () => {
    const result = validateFilename('not-a-valid-name.md');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('generates correct entry path', async () => {
    const date = new Date(2026, 1, 12); // Month is 0-indexed, so 1 = February
    const journalDir = '/test/journals';
    const result = await getEntryPath(date, 'checkout-v1', journalDir);
    expect(result).toBe(path.join(journalDir, '2026', '02', '2026-02-12-checkout-v1.md'));
  });
});
