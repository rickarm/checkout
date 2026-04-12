const { GoogleDriveAdapter } = require('../lib/storage/adapters/google-drive-adapter');

// Mock the googleapis module
jest.mock('googleapis', () => {
  const mockDrive = {
    files: {
      list: jest.fn(),
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  };
  return {
    google: {
      drive: jest.fn(() => mockDrive),
      auth: { OAuth2: jest.fn() }
    },
    _mockDrive: mockDrive
  };
});

const { _mockDrive: mockDrive } = require('googleapis');

describe('GoogleDriveAdapter', () => {
  let adapter;
  const folderId = 'test-folder-id';
  const mockAuth = {};

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GoogleDriveAdapter({ auth: mockAuth, folderId });
  });

  describe('initialize', () => {
    test('verifies folder exists', async () => {
      mockDrive.files.get.mockResolvedValue({ data: { id: folderId, name: 'Checkout' } });

      await adapter.initialize();

      expect(mockDrive.files.get).toHaveBeenCalledWith({
        fileId: folderId,
        fields: 'id,name'
      });
    });

    test('throws if folder not found', async () => {
      mockDrive.files.get.mockRejectedValue(new Error('File not found'));

      await expect(adapter.initialize()).rejects.toThrow('File not found');
    });
  });

  describe('listEntries', () => {
    test('returns parsed entries from Drive files', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [
            { id: 'file-1', name: '2026-04-12-checkout-v1.md', modifiedTime: '2026-04-12T20:00:00Z' },
            { id: 'file-2', name: '2026-04-13-checkout-v1.md', modifiedTime: '2026-04-13T20:00:00Z' }
          ]
        }
      });

      const entries = await adapter.listEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe('2026-04-12-checkout-v1');
      expect(entries[0].date).toBe('2026-04-12');
      expect(entries[0].templateId).toBe('checkout-v1');
      expect(entries[1].id).toBe('2026-04-13-checkout-v1');
    });

    test('filters by year', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: {
          files: [
            { id: 'file-1', name: '2026-04-12-checkout-v1.md', modifiedTime: '2026-04-12T20:00:00Z' },
            { id: 'file-2', name: '2025-06-01-checkout-v1.md', modifiedTime: '2025-06-01T20:00:00Z' }
          ]
        }
      });

      const entries = await adapter.listEntries({ year: '2026' });

      expect(entries).toHaveLength(1);
      expect(entries[0].date).toBe('2026-04-12');
    });

    test('returns empty array when no files', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      const entries = await adapter.listEntries();
      expect(entries).toEqual([]);
    });
  });

  describe('getEntry', () => {
    const markdownContent = [
      '## How present do you feel right now?',
      '8',
      '',
      '## Your joy-moment',
      'Coffee',
      '',
      '---',
      '',
      '**Metadata**',
      '- Created: 2026-04-12T20:00:00.000Z',
      '- Template: checkout-v1',
      '- Version: 1.0'
    ].join('\n');

    test('returns parsed entry', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [{ id: 'file-1', name: '2026-04-12-checkout-v1.md' }] }
      });
      mockDrive.files.get.mockResolvedValue({ data: markdownContent });

      const entry = await adapter.getEntry('2026-04-12-checkout-v1');

      expect(entry.id).toBe('2026-04-12-checkout-v1');
      expect(entry.date).toBe('2026-04-12');
      expect(entry.templateId).toBe('checkout-v1');
      expect(entry.source.backend).toBe('google-drive');
      expect(entry.sections).toHaveLength(2);
      expect(entry.sections[0].title).toBe('How present do you feel right now?');
      expect(entry.sections[0].content).toBe('8');
    });

    test('throws ENOENT when file not found', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      await expect(adapter.getEntry('2026-04-12-checkout-v1')).rejects.toMatchObject({
        code: 'ENOENT'
      });
    });

    test('throws for invalid entryId format', async () => {
      await expect(adapter.getEntry('bad-id')).rejects.toThrow('Invalid entryId');
    });
  });

  describe('saveEntry', () => {
    test('creates file in Drive and returns id + mtime', async () => {
      mockDrive.files.create.mockResolvedValue({
        data: { id: 'new-file-id', name: '2026-04-12-checkout-v1.md', modifiedTime: '2026-04-12T20:00:00Z' }
      });

      const result = await adapter.saveEntry(
        { markdown: '# test', templateId: 'checkout-v1' },
        new Date(2026, 3, 12)  // April 12, 2026
      );

      expect(result.id).toBe('2026-04-12-checkout-v1');
      expect(new Date(result.mtime).getTime()).not.toBeNaN();
      expect(mockDrive.files.create).toHaveBeenCalledWith(expect.objectContaining({
        requestBody: expect.objectContaining({
          name: '2026-04-12-checkout-v1.md',
          parents: [folderId]
        })
      }));
    });
  });

  describe('updateEntry', () => {
    test('updates file content', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [{ id: 'file-1', name: '2026-04-12-checkout-v1.md' }] }
      });
      mockDrive.files.update.mockResolvedValue({
        data: { id: 'file-1', name: '2026-04-12-checkout-v1.md', modifiedTime: '2026-04-12T21:00:00Z' }
      });

      const result = await adapter.updateEntry('2026-04-12-checkout-v1', { markdown: '# updated' });

      expect(result.id).toBe('2026-04-12-checkout-v1');
      expect(mockDrive.files.update).toHaveBeenCalledWith(expect.objectContaining({
        fileId: 'file-1'
      }));
    });

    test('throws ENOENT when file not found', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      await expect(adapter.updateEntry('2026-04-12-checkout-v1', { markdown: '# x' }))
        .rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  describe('deleteEntry', () => {
    test('trashes file in Drive', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [{ id: 'file-1', name: '2026-04-12-checkout-v1.md' }] }
      });
      mockDrive.files.update.mockResolvedValue({ data: {} });

      const result = await adapter.deleteEntry('2026-04-12-checkout-v1');

      expect(result.success).toBe(true);
      expect(mockDrive.files.update).toHaveBeenCalledWith({
        fileId: 'file-1',
        requestBody: { trashed: true }
      });
    });

    test('returns failure when file not found', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      const result = await adapter.deleteEntry('2026-04-12-checkout-v1');
      expect(result.success).toBe(false);
    });
  });

  describe('entryExists', () => {
    test('returns true when file exists', async () => {
      mockDrive.files.list.mockResolvedValue({
        data: { files: [{ id: 'file-1', name: '2026-04-12-checkout-v1.md' }] }
      });

      expect(await adapter.entryExists('2026-04-12-checkout-v1')).toBe(true);
    });

    test('returns false when file not found', async () => {
      mockDrive.files.list.mockResolvedValue({ data: { files: [] } });

      expect(await adapter.entryExists('2026-04-12-checkout-v1')).toBe(false);
    });
  });

  describe('rebuildIndex', () => {
    test('returns success (no-op)', async () => {
      const result = await adapter.rebuildIndex();
      expect(result.success).toBe(true);
    });
  });

  describe('config methods', () => {
    test('getConfig throws', async () => {
      await expect(adapter.getConfig()).rejects.toThrow('does not support getConfig');
    });

    test('saveConfig throws', async () => {
      await expect(adapter.saveConfig({})).rejects.toThrow('does not support saveConfig');
    });
  });
});
