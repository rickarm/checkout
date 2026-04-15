/**
 * Google Drive OAuth consent flow routes.
 *
 * Three endpoints:
 * - GET /auth/google/connect  — redirect to Google consent screen
 * - GET /auth/google/callback — handle OAuth callback, store tokens
 * - GET /auth/google/status   — check if current user has connected Drive
 */
const express = require('express');
const { google } = require('googleapis');

/**
 * Create the Google OAuth router.
 *
 * @param {object} options
 * @param {import('./token-store').TokenStore} options.tokenStore
 * @param {string} options.clientId - Google OAuth client ID
 * @param {string} options.clientSecret - Google OAuth client secret
 * @param {string} options.redirectUri - OAuth callback URL
 * @returns {express.Router}
 */
function createGoogleOAuthRouter({ tokenStore, clientId, clientSecret, redirectUri }) {
  const router = express.Router();

  function createOAuth2Client() {
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  // GET /auth/google/connect — start OAuth flow
  router.get('/connect', (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const oauth2Client = createOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state: userId
    });

    res.redirect(authUrl);
  });

  // GET /auth/google/callback — handle OAuth callback
  router.get('/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }

    const oauth2Client = createOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error: 'No refresh token received. Please revoke app access in Google account settings and try again.'
      });
    }

    // Create or find the Checkout folder in user's Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    let folderId;

    // Check if Checkout folder already exists
    const existing = await drive.files.list({
      q: "name='Checkout' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id)',
      pageSize: 1
    });

    if (existing.data.files && existing.data.files.length > 0) {
      folderId = existing.data.files[0].id;
    } else {
      // Create the folder
      const folder = await drive.files.create({
        requestBody: {
          name: 'Checkout',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      folderId = folder.data.id;
    }

    // Store refresh token and folder ID
    await tokenStore.saveToken(userId, {
      refreshToken: tokens.refresh_token,
      folderId
    });

    // Redirect back to the app
    const appUrl = process.env.APP_URL || '/';
    res.redirect(`${appUrl}?drive=connected`);
  });

  // GET /auth/google/status — check connection status
  router.get('/status', async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = await tokenStore.getToken(userId);
    res.json({
      connected: !!token,
      folderId: token ? token.folderId : null
    });
  });

  return router;
}

module.exports = { createGoogleOAuthRouter };
