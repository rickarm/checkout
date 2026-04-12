const { createUserServiceMiddleware } = require('../lib/api/middleware/user-service');

// Mock googleapis
jest.mock('googleapis', () => {
  const mockOAuth2 = jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn()
  }));
  return {
    google: {
      auth: { OAuth2: mockOAuth2 },
      drive: jest.fn(() => ({ files: { list: jest.fn(), get: jest.fn() } }))
    }
  };
});

describe('userServiceMiddleware', () => {
  let middleware;
  let mockTokenStore;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockTokenStore = {
      getToken: jest.fn()
    };

    middleware = createUserServiceMiddleware({
      tokenStore: mockTokenStore,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    });

    req = { auth: { userId: 'user-1' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('returns 401 when no userId', async () => {
    req.auth = {};

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when no token (Drive not connected)', async () => {
    mockTokenStore.getToken.mockResolvedValue(null);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Google Drive not connected'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches journalService to req and calls next when token exists', async () => {
    mockTokenStore.getToken.mockResolvedValue({
      refreshToken: 'refresh-123',
      folderId: 'folder-456'
    });

    await middleware(req, res, next);

    expect(req.journalService).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});
