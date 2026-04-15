/**
 * Per-request middleware that creates a user-scoped JournalService.
 *
 * After Clerk auth runs, this middleware:
 * 1. Gets userId from req.auth
 * 2. Looks up the user's Drive refresh token from TokenStore
 * 3. Creates an OAuth2 client with that refresh token
 * 4. Creates a GoogleDriveAdapter scoped to the user's folder
 * 5. Creates a JournalService with that adapter
 * 6. Attaches it to req.journalService
 *
 * If the user hasn't connected Drive, returns 403.
 */
const { google } = require('googleapis');
const { GoogleDriveAdapter } = require('../../storage/adapters/google-drive-adapter');
const { JournalService } = require('../../services/journal-service');

/**
 * Create user-service middleware.
 *
 * @param {object} options
 * @param {import('../../auth/token-store').TokenStore} options.tokenStore
 * @param {string} options.clientId - Google OAuth client ID
 * @param {string} options.clientSecret - Google OAuth client secret
 * @returns {Function} Express middleware
 */
function createUserServiceMiddleware({ tokenStore, clientId, clientSecret }) {
  return async (req, res, next) => {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = await tokenStore.getToken(userId);
    if (!token) {
      return res.status(403).json({
        error: 'Google Drive not connected',
        connectUrl: '/auth/google/connect'
      });
    }

    // Create per-request OAuth2 client with user's refresh token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: token.refreshToken });

    const adapter = new GoogleDriveAdapter({
      auth: oauth2Client,
      folderId: token.folderId
    });

    req.journalService = new JournalService(adapter);
    next();
  };
}

module.exports = { createUserServiceMiddleware };
