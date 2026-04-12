const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { LocalFilesystemAdapter } = require('../lib/storage/adapters/local-filesystem-adapter');
const { JournalService } = require('../lib/services/journal-service');
const { Entry } = require('../lib/core/entry');

describe('JournalService', () => {
  let service;
  let adapter;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `checkout-service-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    adapter = new LocalFilesystemAdapter({ journalDir: testDir });
    service = new JournalService(adapter);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createEntry', () => {
    test('saves an entry and returns id/path', async () => {
      const entry = new Entry('checkout-v1');
      entry.setAnswer('presence', '8');
      entry.setAnswer('joy', 'Coffee');
      entry.setAnswer('values', 'Curiosity');
      entry.setAnswer('letgo', 'Worry');

      const date = new Date(2026, 1, 12);
      const result = await service.createEntry(entry, date);

      expect(result.id).toBe('2026-02-12-checkout-v1');
      expect(result.path).toContain('2026-02-12-checkout-v1.md');

      // Verify file was actually written
      const content = await fs.readFile(result.path, 'utf-8');
      expect(content).toContain('## How present do you feel right now?');
      expect(content).toContain('8');
      expect(content).toContain('Coffee');
    });
  });

  describe('listEntries', () => {
    test('returns entries after saving', async () => {
      const entry = new Entry('checkout-v1');
      entry.setAnswer('presence', '7');
      entry.setAnswer('joy', 'Sunset');
      entry.setAnswer('values', 'Compassion');

      await service.createEntry(entry, new Date(2026, 1, 12));
      await service.createEntry(entry, new Date(2026, 1, 13));

      const entries = await service.listEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty('id');
      expect(entries[0]).toHaveProperty('date');
      expect(entries[0]).toHaveProperty('templateId');
    });

    test('returns empty array when no entries', async () => {
      const entries = await service.listEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('getEntry', () => {
    test('retrieves a saved entry with full structure', async () => {
      const entry = new Entry('checkout-v1');
      entry.setAnswer('presence', '9');
      entry.setAnswer('joy', 'Walk in the park');
      entry.setAnswer('values', 'Authenticity');
      entry.setAnswer('letgo', 'Self-doubt');

      await service.createEntry(entry, new Date(2026, 3, 15));

      const result = await service.getEntry('2026-04-15-checkout-v1');
      expect(result.id).toBe('2026-04-15-checkout-v1');
      expect(result.date).toBe('2026-04-15');
      expect(result.templateId).toBe('checkout-v1');
      expect(result.sections).toHaveLength(4);
      expect(result.sections[0].content).toBe('9');
      expect(result.metadata.template).toBe('checkout-v1');
      expect(result.source.backend).toBe('local-filesystem');
    });
  });

  describe('loadTemplate', () => {
    test('loads checkout-v1 template', async () => {
      const template = await service.loadTemplate('checkout-v1');
      expect(template.id).toBe('checkout-v1');
      expect(template.questions).toHaveLength(4);
    });
  });

  describe('rebuildIndex', () => {
    test('generates index after saving entries', async () => {
      const entry = new Entry('checkout-v1');
      entry.setAnswer('presence', '6');
      entry.setAnswer('joy', 'Tea');
      entry.setAnswer('values', 'Determination');

      await service.createEntry(entry, new Date(2026, 1, 12));

      const result = await service.rebuildIndex();
      expect(result.success).toBe(true);
      expect(result.path).toContain('index.md');
    });
  });

  describe('validateAll', () => {
    test('validates saved entries', async () => {
      const entry = new Entry('checkout-v1');
      entry.setAnswer('presence', '8');
      entry.setAnswer('joy', 'Music');
      entry.setAnswer('values', 'Curiosity');

      await service.createEntry(entry, new Date(2026, 1, 12));

      const result = await service.validateAll();
      expect(result.success).toBe(true);
    });

    test('returns success with no entries', async () => {
      const result = await service.validateAll();
      expect(result.success).toBe(true);
    });
  });
});
