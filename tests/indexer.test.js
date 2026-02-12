const { generateIndex, saveIndex, createIndex } = require('../lib/features/indexer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

describe('Indexer', () => {
  let testDir;
  let journalDir;

  beforeEach(async () => {
    // Create temporary directories
    testDir = path.join(os.tmpdir(), `checkout-indexer-test-${Date.now()}`);
    journalDir = path.join(testDir, 'journals');
    await fs.mkdir(journalDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('generates index with single entry', async () => {
    // Create a test entry
    const yearMonth = path.join(journalDir, '2026', '02');
    await fs.mkdir(yearMonth, { recursive: true });
    const entryPath = path.join(yearMonth, '2026-02-12-checkout-v1.md');
    await fs.writeFile(entryPath, 'test content');

    const result = await generateIndex(journalDir);

    expect(result.success).toBe(true);
    expect(result.markdown).toContain('# Journal Index');
    expect(result.markdown).toContain('*1 entry*');
    expect(result.markdown).toContain('## 2026');
    expect(result.markdown).toContain('### February');
    expect(result.markdown).toContain('[[./2026/02/2026-02-12-checkout-v1.md]]');
    expect(result.entryCount).toBe(1);
  });

  test('generates index with multiple entries across years', async () => {
    // Create entries in different years/months
    await fs.mkdir(path.join(journalDir, '2025', '12'), { recursive: true });
    await fs.mkdir(path.join(journalDir, '2026', '01'), { recursive: true });
    await fs.mkdir(path.join(journalDir, '2026', '02'), { recursive: true });

    await fs.writeFile(path.join(journalDir, '2025', '12', '2025-12-31-checkout-v1.md'), 'content');
    await fs.writeFile(path.join(journalDir, '2026', '01', '2026-01-15-checkout-v1.md'), 'content');
    await fs.writeFile(path.join(journalDir, '2026', '02', '2026-02-10-checkout-v1.md'), 'content');

    const result = await generateIndex(journalDir);

    expect(result.success).toBe(true);
    expect(result.markdown).toContain('*3 entries*');
    expect(result.markdown).toContain('## 2026');
    expect(result.markdown).toContain('## 2025');
    expect(result.markdown).toContain('### February');
    expect(result.markdown).toContain('### January');
    expect(result.markdown).toContain('### December');
    expect(result.entryCount).toBe(3);
  });

  test('handles empty journal directory', async () => {
    const result = await generateIndex(journalDir);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No entries found');
  });

  test('saves index to file', async () => {
    const markdown = '# Test Index\n\nContent here';
    const result = await saveIndex(journalDir, markdown);

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(journalDir, 'index.md'));

    // Verify file was created
    const content = await fs.readFile(result.path, 'utf-8');
    expect(content).toBe(markdown);
  });

  test('createIndex combines generation and saving', async () => {
    // Create a test entry
    const yearMonth = path.join(journalDir, '2026', '02');
    await fs.mkdir(yearMonth, { recursive: true });
    await fs.writeFile(path.join(yearMonth, '2026-02-12-checkout-v1.md'), 'test');

    const result = await createIndex(journalDir);

    expect(result.success).toBe(true);
    expect(result.path).toBe(path.join(journalDir, 'index.md'));
    expect(result.entryCount).toBe(1);

    // Verify file exists
    const exists = require('fs').existsSync(result.path);
    expect(exists).toBe(true);
  });

  test('index includes generation timestamp', async () => {
    const yearMonth = path.join(journalDir, '2026', '02');
    await fs.mkdir(yearMonth, { recursive: true });
    await fs.writeFile(path.join(yearMonth, '2026-02-12-checkout-v1.md'), 'test');

    const result = await generateIndex(journalDir);

    expect(result.markdown).toContain('*Generated:');
    expect(result.markdown).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('sorts entries in descending order', async () => {
    await fs.mkdir(path.join(journalDir, '2026', '02'), { recursive: true });
    await fs.writeFile(path.join(journalDir, '2026', '02', '2026-02-10-checkout-v1.md'), 'content');
    await fs.writeFile(path.join(journalDir, '2026', '02', '2026-02-15-checkout-v1.md'), 'content');
    await fs.writeFile(path.join(journalDir, '2026', '02', '2026-02-05-checkout-v1.md'), 'content');

    const result = await generateIndex(journalDir);
    const markdown = result.markdown;

    // Check order: 15 should appear before 10, and 10 before 05
    const pos15 = markdown.indexOf('**15**');
    const pos10 = markdown.indexOf('**10**');
    const pos05 = markdown.indexOf('**05**');

    expect(pos15).toBeLessThan(pos10);
    expect(pos10).toBeLessThan(pos05);
  });
});
