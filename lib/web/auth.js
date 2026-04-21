const crypto = require('crypto');

// ── Password resolution ──────────────────────────────────────
// Returns the expected password for a user, or null if none is set.
// Precedence: env var CHECKOUT_PASSWORD_<USERID> > userConfig.password.
// Env var overrides allow keeping passwords out of config.json.
function getExpectedPassword(userId, userConfig) {
  const envKey = `CHECKOUT_PASSWORD_${userId.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (typeof envVal === 'string' && envVal.length > 0) return envVal;
  if (userConfig && typeof userConfig.password === 'string' && userConfig.password.length > 0) {
    return userConfig.password;
  }
  return null;
}

function hasPassword(userId, userConfig) {
  return getExpectedPassword(userId, userConfig) !== null;
}

// Constant-time string compare. Returns false for mismatched lengths
// without leaking timing information about the expected value.
function verifyPassword(userId, userConfig, submitted) {
  const expected = getExpectedPassword(userId, userConfig);
  if (expected === null) return true; // no password configured
  if (typeof submitted !== 'string') return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(submitted, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isAuthed(req, userId) {
  return !!(req.session && req.session.auth && req.session.auth[userId]);
}

function setAuthed(req, userId) {
  if (!req.session.auth) req.session.auth = {};
  req.session.auth[userId] = true;
}

function clearAuthed(req, userId) {
  if (req.session && req.session.auth) delete req.session.auth[userId];
}

module.exports = {
  getExpectedPassword,
  hasPassword,
  verifyPassword,
  isAuthed,
  setAuthed,
  clearAuthed,
};
