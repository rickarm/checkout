/**
 * Checkout API server factories.
 *
 * Two modes:
 * - createApiServer(journalService) — single-user mode (Mac mini, CLI)
 * - createMultiUserApiServer(options) — multi-user mode (Replit + Google Drive)
 *
 * Limitations:
 * - import/validate flows are not exposed via API
 * - updateEntry relies on section-title matching (see journal-service.js)
 */

const express = require('express');
const { createEntriesRouter } = require('./routes/entries');

/**
 * Create the API Express app.
 *
 * @param {import('../services/journal-service').JournalService} journalService
 * @returns {express.Application}
 */
function createApiServer(journalService) {
  const app = express();

  // JSON body parsing
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Optional API key auth
  app.use((req, res, next) => {
    const requiredKey = process.env.CHECKOUT_API_KEY;
    if (!requiredKey) return next();
    const providedKey = req.headers['x-api-key'];
    if (providedKey === requiredKey) return next();
    res.status(401).json({ error: 'Invalid or missing API key' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Template endpoint
  app.get('/api/template', async (req, res) => {
    const template = await journalService.loadTemplate('checkout-v1');
    res.json(template);
  });

  // Entry routes
  app.use('/api/entries', createEntriesRouter(journalService));

  // 404 handler for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('API error:', err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

/**
 * Create the multi-user API Express app.
 *
 * Uses Clerk for authentication and per-request GoogleDriveAdapter
 * scoped to each user's Drive folder.
 *
 * @param {object} options
 * @param {import('../auth/token-store').TokenStore} options.tokenStore
 * @param {string} options.googleClientId
 * @param {string} options.googleClientSecret
 * @param {string} options.googleRedirectUri
 * @returns {express.Application}
 */
function createMultiUserApiServer({ tokenStore, googleClientId, googleClientSecret, googleRedirectUri }) {
  const { createClerkAuth } = require('../auth/clerk');
  const { createGoogleOAuthRouter } = require('../auth/google-drive-oauth');
  const { createUserServiceMiddleware } = require('./middleware/user-service');

  const app = express();

  // JSON body parsing
  app.use(express.json());

  // CORS middleware
  app.use((req, res, next) => {
    const origin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Health check (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Clerk auth for all subsequent routes
  const clerkAuth = createClerkAuth();
  app.use(clerkAuth);

  // Google OAuth routes (require Clerk auth but not Drive connection)
  app.use('/auth/google', createGoogleOAuthRouter({
    tokenStore,
    clientId: googleClientId,
    clientSecret: googleClientSecret,
    redirectUri: googleRedirectUri
  }));

  // Template endpoint (no Drive connection needed)
  app.get('/api/template', async (req, res) => {
    const { loadTemplate } = require('../core/entry');
    const template = await loadTemplate('checkout-v1');
    res.json(template);
  });

  // Per-request user-service middleware (requires Drive connection)
  app.use('/api/entries', createUserServiceMiddleware({
    tokenStore,
    clientId: googleClientId,
    clientSecret: googleClientSecret
  }));

  // Entry routes (service comes from req.journalService)
  app.use('/api/entries', createEntriesRouter());

  // 404 handler for unmatched API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('API error:', err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

module.exports = { createApiServer, createMultiUserApiServer };
