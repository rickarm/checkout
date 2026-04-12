#!/usr/bin/env node

/**
 * Multi-user API server entry point.
 *
 * Boots up:
 * - PostgreSQL connection pool + TokenStore
 * - Express app with Clerk auth + Google Drive per-user storage
 *
 * Environment variables:
 *   DATABASE_URL         — PostgreSQL connection string
 *   CLERK_SECRET_KEY     — Clerk backend key (used by @clerk/express)
 *   GOOGLE_CLIENT_ID     — Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET — Google OAuth client secret
 *   GOOGLE_REDIRECT_URI  — OAuth callback URL
 *   CORS_ORIGIN          — Allowed CORS origin (default: *)
 *   APP_URL              — Frontend URL for post-OAuth redirect
 *   PORT                 — Server port (default: 3001)
 */

const { Pool } = require('pg');
const { TokenStore } = require('../lib/auth/token-store');
const { createMultiUserApiServer } = require('../lib/api/server');

async function main() {
  // Validate required environment variables
  const required = ['DATABASE_URL', 'CLERK_SECRET_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Initialize PostgreSQL + token store
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const tokenStore = new TokenStore(pool);
  await tokenStore.initialize();

  // Create the multi-user API server
  const app = createMultiUserApiServer({
    tokenStore,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI
  });

  const port = parseInt(process.env.PORT) || 3001;

  app.listen(port, () => {
    console.log(`Checkout multi-user API running on http://localhost:${port}`);
    console.log(`Clerk auth: enabled`);
    console.log(`Google Drive: enabled`);
    console.log(`CORS origin: ${process.env.CORS_ORIGIN || '*'}`);
  });
}

main().catch(err => {
  console.error('Failed to start multi-user API server:', err.message);
  process.exit(1);
});
