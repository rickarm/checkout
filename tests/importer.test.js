const { importFile } = require('../lib/features/importer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('Importer', () => {
  let testDir;
  let journalDir;

  beforeEach(async () => {
    // Create temporary directories
    testDir = path.join(os.tmpdir(), `checkout-test-${Date.now()}`);
    journalDir = path.join(testDir, 'journals');
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(journalDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('imports valid file successfully', async () => {
    // Create a test file
    const sourceFile = path.join(testDir, '2026-02-13-checkout-v1.md');
    const content = `## Test\nContent\n\n---\n\n**Metadata**\n- Created: 2026-02-13\n- Template: checkout-v1\n- Version: 1.0\n`;
    await fs.writeFile(sourceFile, content);

    const result = await importFile(sourceFile, journalDir);

    expect(result.success).toBe(true);
    expect(result.targetPath).toContain('2026/02/2026-02-13-checkout-v1.md');
  });

  test('rejects invalid filename', async () => {
    const sourceFile = path.join(testDir, 'invalid-name.md');
    await fs.writeFile(sourceFile, 'content');

    const result = await importFile(sourceFile, journalDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Filename must match');
  });

  test('rejects file without metadata', async () => {
    const sourceFile = path.join(testDir, '2026-02-13-checkout-v1.md');
    await fs.writeFile(sourceFile, 'Just some content without metadata');

    const result = await importFile(sourceFile, journalDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain('metadata');
  });

  test('prevents duplicate imports', async () => {
    const sourceFile = path.join(testDir, '2026-02-13-checkout-v1.md');
    const content = `## Test\nContent\n\n---\n\n**Metadata**\n- Created: 2026-02-13\n- Template: checkout-v1\n- Version: 1.0\n`;
    await fs.writeFile(sourceFile, content);

    // First import
    await importFile(sourceFile, journalDir);

    // Second import should fail
    const result = await importFile(sourceFile, journalDir);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
  });
});
