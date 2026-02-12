const { validateEntry, validateStructure } = require('../lib/features/validator');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('Validator', () => {
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `checkout-validator-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('validates correct entry', async () => {
    const filePath = path.join(testDir, '2026-02-13-checkout-v1.md');
    const content = `## How present do you feel right now?\n8\n\n## Your joy-moment\nTest\n\n## Think of your values\nTest\n\n---\n\n**Metadata**\n- Created: 2026-02-13T00:00:00.000Z\n- Template: checkout-v1\n- Version: 1.0\n`;
    await fs.writeFile(filePath, content);

    const result = await validateEntry(filePath);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('detects invalid filename', async () => {
    const filePath = path.join(testDir, 'invalid-name.md');
    const content = '## Test\n\n---\n\n**Metadata**\n';
    await fs.writeFile(filePath, content);

    const result = await validateEntry(filePath);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('detects missing metadata', async () => {
    const filePath = path.join(testDir, '2026-02-13-checkout-v1.md');
    const content = '## Test\nJust content without metadata';
    await fs.writeFile(filePath, content);

    const result = await validateEntry(filePath);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('metadata'))).toBe(true);
  });

  test('validates directory structure', async () => {
    const result = await validateStructure(testDir);
    expect(result.valid).toBe(true);
  });

  test('detects invalid directory', async () => {
    const result = await validateStructure('/nonexistent/path');
    expect(result.valid).toBe(false);
  });
});
