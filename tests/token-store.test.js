const { TokenStore } = require('../lib/auth/token-store');

describe('TokenStore', () => {
  let tokenStore;
  let mockPool;
  let queryResults;

  beforeEach(() => {
    queryResults = { rows: [] };
    mockPool = {
      query: jest.fn().mockImplementation(() => Promise.resolve(queryResults))
    };
    tokenStore = new TokenStore(mockPool);
  });

  describe('initialize', () => {
    test('creates user_tokens table', async () => {
      await tokenStore.initialize();

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const sql = mockPool.query.mock.calls[0][0];
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS user_tokens');
      expect(sql).toContain('user_id TEXT PRIMARY KEY');
      expect(sql).toContain('google_refresh_token TEXT NOT NULL');
      expect(sql).toContain('google_drive_folder_id TEXT NOT NULL');
    });
  });

  describe('getToken', () => {
    test('returns token data when found', async () => {
      queryResults = {
        rows: [{ google_refresh_token: 'refresh-123', google_drive_folder_id: 'folder-456' }]
      };

      const result = await tokenStore.getToken('user-1');

      expect(result).toEqual({ refreshToken: 'refresh-123', folderId: 'folder-456' });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-1']
      );
    });

    test('returns null when not found', async () => {
      queryResults = { rows: [] };

      const result = await tokenStore.getToken('user-1');
      expect(result).toBeNull();
    });
  });

  describe('saveToken', () => {
    test('upserts token with userId', async () => {
      await tokenStore.saveToken('user-1', { refreshToken: 'refresh-123', folderId: 'folder-456' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_tokens'),
        ['user-1', 'refresh-123', 'folder-456']
      );
      const sql = mockPool.query.mock.calls[0][0];
      expect(sql).toContain('ON CONFLICT (user_id) DO UPDATE');
    });
  });

  describe('deleteToken', () => {
    test('deletes by userId', async () => {
      await tokenStore.deleteToken('user-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_tokens'),
        ['user-1']
      );
    });
  });
});
