const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { LocalFilesystemAdapter } = require('../lib/storage/adapters/local-filesystem-adapter');
const { serializeEntry } = require('../lib/domain/markdown');

const testTemplate = {
  id: 'checkout-v1',
  questions: [
    { id: 'presence', order: 1, title: 'How present do you feel right now?' },
    { id: 'joy', order: 2, title: 'Your joy-moment' },
    { id: 'values', order: 3, title: 'Think of your values' },
    { id: 'letgo', order: 4, title: 'What do you decide to let go of?' }
  ]
};

describe('LocalFilesystemAdapter', () => {
  let adapter;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `checkout-adapter-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    adapter = new LocalFilesystemAdapter({ journalDir: testDir });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    test('creates journal directory structure', async () => {
      await adapter.initialize();
      const stat = await fs.stat(testDir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('saveEntry + getEntry', () => {
    test('saves and retrieves an entry', async () => {
      const entry = {
        templateId: 'checkout-v1',
        createdAt: '2026-02-12T22:00:00.000Z',
        answers: {
          presence: '8',
          joy: 'Coffee',
          values: 'Curiosity',
          letgo: 'Worry'
        }
      };
      const markdown = serializeEntry(entry, testTemplate);
      const date = new Date(2026, 1, 12); // Feb 12, 2026

      // Save
      const saveResult = await adapter.saveEntry({ markdown, templateId: 'checkout-v1' }, date);
      expect(saveResult.id).toBe('2026-02-12-checkout-v1');
      expect(saveResult.path).toContain('2026-02-12-checkout-v1.md');
      expect(new Date(saveResult.mtime).getTime()).not.toBeNaN();

      // Get
      const getResult = await adapter.getEntry('2026-02-12-checkout-v1');
      expect(getResult.id).toBe('2026-02-12-checkout-v1');
      expect(getResult.date).toBe('2026-02-12');
      expect(getResult.templateId).toBe('checkout-v1');
      expect(getResult.markdown).toBe(markdown);
      expect(getResult.sections).toHaveLength(4);
      expect(getResult.sections[0].title).toBe('How present do you feel right now?');
      expect(getResult.metadata.created).toBe('2026-02-12T22:00:00.000Z');
      expect(getResult.source.backend).toBe('local-filesystem');
      expect(getResult.source.path).toContain('2026-02-12-checkout-v1.md');
    });
  });

  describe('listEntries', () => {
    test('lists saved entries with correct shape', async () => {
      // Create two entries
      const entry1 = {
        templateId: 'checkout-v1',
        createdAt: '2026-02-12T22:00:00.000Z',
        answers: { presence: '8', joy: 'A', values: 'B', letgo: 'C' }
      };
      const entry2 = {
        templateId: 'checkout-v1',
        createdAt: '2026-02-13T22:00:00.000Z',
        answers: { presence: '7', joy: 'D', values: 'E', letgo: 'F' }
      };

      await adapter.saveEntry(
        { markdown: serializeEntry(entry1, testTemplate), templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );
      await adapter.saveEntry(
        { markdown: serializeEntry(entry2, testTemplate), templateId: 'checkout-v1' },
        new Date(2026, 1, 13)
      );

      const entries = await adapter.listEntries();
      expect(entries).toHaveLength(2);

      // Check shape of each entry
      for (const entry of entries) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('templateId');
        expect(entry).toHaveProperty('filename');
        expect(entry).toHaveProperty('path');
        expect(entry).toHaveProperty('mtime');
        expect(entry.templateId).toBe('checkout-v1');
      }
    });

    test('filters by year', async () => {
      await adapter.saveEntry(
        { markdown: 'test', templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );
      await adapter.saveEntry(
        { markdown: 'test', templateId: 'checkout-v1' },
        new Date(2025, 5, 1)
      );

      const filtered = await adapter.listEntries({ year: '2026' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].date).toBe('2026-02-12');
    });
  });

  describe('entryExists', () => {
    test('returns false for non-existent entry', async () => {
      const exists = await adapter.entryExists('2026-02-12-checkout-v1');
      expect(exists).toBe(false);
    });

    test('returns true for existing entry', async () => {
      await adapter.saveEntry(
        { markdown: 'test', templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );
      const exists = await adapter.entryExists('2026-02-12-checkout-v1');
      expect(exists).toBe(true);
    });
  });

  describe('deleteEntry', () => {
    test('deletes an existing entry', async () => {
      await adapter.saveEntry(
        { markdown: 'test', templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );
      expect(await adapter.entryExists('2026-02-12-checkout-v1')).toBe(true);

      const result = await adapter.deleteEntry('2026-02-12-checkout-v1');
      expect(result.success).toBe(true);
      expect(await adapter.entryExists('2026-02-12-checkout-v1')).toBe(false);
    });
  });

  describe('updateEntry', () => {
    test('overwrites an existing entry', async () => {
      await adapter.saveEntry(
        { markdown: 'original', templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );

      const result = await adapter.updateEntry('2026-02-12-checkout-v1', { markdown: 'updated' });
      expect(result.id).toBe('2026-02-12-checkout-v1');
      expect(new Date(result.mtime).getTime()).not.toBeNaN();

      const entry = await adapter.getEntry('2026-02-12-checkout-v1');
      expect(entry.markdown).toBe('updated');
    });
  });

  describe('rebuildIndex', () => {
    test('generates index file', async () => {
      await adapter.saveEntry(
        { markdown: 'test', templateId: 'checkout-v1' },
        new Date(2026, 1, 12)
      );

      const result = await adapter.rebuildIndex();
      expect(result.success).toBe(true);
      expect(result.path).toContain('index.md');
    });
  });

  describe('_resolveEntryPath', () => {
    test('resolves valid entryId to path', () => {
      const p = adapter._resolveEntryPath('2026-02-12-checkout-v1');
      expect(p).toBe(path.join(testDir, '2026', '02', '2026-02-12-checkout-v1.md'));
    });

    test('throws on invalid entryId', () => {
      expect(() => adapter._resolveEntryPath('bad-id')).toThrow('Invalid entryId format');
    });
  });
});
