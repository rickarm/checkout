/**
 * Clerk JWT verification middleware for Express.
 *
 * Uses @clerk/express to verify JWTs from the Clerk frontend.
 * Attaches userId to req.auth for downstream middleware.
 *
 * Requires CLERK_SECRET_KEY environment variable.
 */
const { clerkMiddleware, getAuth, requireAuth } = require('@clerk/express');

/**
 * Create Clerk auth middleware stack.
 *
 * Returns an array of middleware functions:
 * 1. clerkMiddleware() — parses and verifies the Clerk JWT
 * 2. requireAuth() — rejects unauthenticated requests with 401
 *
 * After these run, req.auth.userId is available.
 *
 * @returns {Array<Function>} Express middleware array
 */
function createClerkAuth() {
  return [
    clerkMiddleware(),
    requireAuth()
  ];
}

module.exports = { createClerkAuth, getAuth };
