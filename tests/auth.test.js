/**
 * Integration tests for per-user password auth on the web server.
 * Covers: login gate, successful login, wrong password, logout,
 * env var override, and that unprotected users still work.
 *
 * Run with: npm test
 */

const request = require('supertest');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { createServer } = require('../lib/web/server');

function makeMultiUserConfig(baseDir, { rickPassword, leelaPassword } = {}) {
  return {
    users: {
      rick: {
        journalDir: path.join(baseDir, 'rick'),
        displayName: 'Rick',
        theme: 'doogie',
        template: 'checkout-v1',
        ...(rickPassword !== undefined ? { password: rickPassword } : {}),
      },
      leela: {
        journalDir: path.join(baseDir, 'leela'),
        displayName: 'Leela',
        theme: 'leela',
        template: 'leela-v1',
        ...(leelaPassword !== undefined ? { password: leelaPassword } : {}),
      },
    },
  };
}

describe('Per-user password auth', () => {
  let baseDir;

  beforeAll(async () => {
    baseDir = path.join(os.tmpdir(), `checkout-auth-test-${Date.now()}`);
    await fs.mkdir(path.join(baseDir, 'rick'), { recursive: true });
    await fs.mkdir(path.join(baseDir, 'leela'), { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  describe('with passwords configured for both users', () => {
    let app;
    beforeEach(() => {
      app = createServer(makeMultiUserConfig(baseDir, {
        rickPassword: 'rick-secret',
        leelaPassword: 'leela-secret',
      }));
    });

    test('unauthenticated request to /u/rick redirects to login', async () => {
      const res = await request(app).get('/u/rick');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/u/rick/login');
    });

    test('unauthenticated request to /u/rick/history redirects to login', async () => {
      const res = await request(app).get('/u/rick/history');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/u/rick/login');
    });

    test('GET /u/rick/login returns the login page', async () => {
      const res = await request(app).get('/u/rick/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Password required for Rick');
      expect(res.text).toContain('type="password"');
    });

    test('wrong password renders login with error (401)', async () => {
      const res = await request(app)
        .post('/u/rick/login')
        .type('form')
        .send({ password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.text).toContain('Incorrect password');
    });

    test('correct password authenticates and grants access', async () => {
      const agent = request.agent(app);
      const loginRes = await agent
        .post('/u/rick/login')
        .type('form')
        .send({ password: 'rick-secret' });
      expect(loginRes.status).toBe(302);
      expect(loginRes.headers.location).toBe('/u/rick');

      const rootRes = await agent.get('/u/rick');
      expect(rootRes.status).toBe(200);
      expect(rootRes.text).toContain('breathingExercise');
    });

    test('rick password does not unlock leela', async () => {
      const agent = request.agent(app);
      await agent
        .post('/u/rick/login')
        .type('form')
        .send({ password: 'rick-secret' });
      const res = await agent.get('/u/leela');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/u/leela/login');
    });

    test('leela can log in independently with her own password', async () => {
      const agent = request.agent(app);
      const loginRes = await agent
        .post('/u/leela/login')
        .type('form')
        .send({ password: 'leela-secret' });
      expect(loginRes.status).toBe(302);
      const res = await agent.get('/u/leela');
      expect(res.status).toBe(200);
    });

    test('logout clears auth and re-gates the user', async () => {
      const agent = request.agent(app);
      await agent
        .post('/u/rick/login')
        .type('form')
        .send({ password: 'rick-secret' });

      const logoutRes = await agent.post('/u/rick/logout');
      expect(logoutRes.status).toBe(302);
      expect(logoutRes.headers.location).toBe('/');

      const gated = await agent.get('/u/rick');
      expect(gated.status).toBe(302);
      expect(gated.headers.location).toBe('/u/rick/login');
    });

    test('logout of rick does not affect leela session', async () => {
      const agent = request.agent(app);
      await agent.post('/u/rick/login').type('form').send({ password: 'rick-secret' });
      await agent.post('/u/leela/login').type('form').send({ password: 'leela-secret' });

      await agent.post('/u/rick/logout');

      const leelaRes = await agent.get('/u/leela');
      expect(leelaRes.status).toBe(200);
      const rickRes = await agent.get('/u/rick');
      expect(rickRes.status).toBe(302);
    });

    test('landing page marks both users as locked when unauthenticated', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Rick');
      expect(res.text).toContain('Leela');
    });
  });

  describe('with no password for rick, password for leela', () => {
    let app;
    beforeEach(() => {
      app = createServer(makeMultiUserConfig(baseDir, {
        leelaPassword: 'leela-secret',
      }));
    });

    test('rick is accessible without login', async () => {
      const res = await request(app).get('/u/rick');
      expect(res.status).toBe(200);
      expect(res.text).toContain('breathingExercise');
    });

    test('leela still requires login', async () => {
      const res = await request(app).get('/u/leela');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/u/leela/login');
    });

    test('visiting /u/rick/login redirects straight through (no password set)', async () => {
      const res = await request(app).get('/u/rick/login');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/u/rick');
    });
  });

  describe('env var overrides config password', () => {
    const ENV_KEY = 'CHECKOUT_PASSWORD_RICK';
    let originalEnv;

    beforeEach(() => {
      originalEnv = process.env[ENV_KEY];
    });
    afterEach(() => {
      if (originalEnv === undefined) delete process.env[ENV_KEY];
      else process.env[ENV_KEY] = originalEnv;
    });

    test('env var sets password even when config has none', async () => {
      process.env[ENV_KEY] = 'env-secret';
      const app = createServer(makeMultiUserConfig(baseDir));

      const gated = await request(app).get('/u/rick');
      expect(gated.status).toBe(302);

      const agent = request.agent(app);
      const bad = await agent.post('/u/rick/login').type('form').send({ password: 'wrong' });
      expect(bad.status).toBe(401);

      const good = await agent.post('/u/rick/login').type('form').send({ password: 'env-secret' });
      expect(good.status).toBe(302);
    });

    test('env var overrides config value', async () => {
      process.env[ENV_KEY] = 'env-secret';
      const app = createServer(makeMultiUserConfig(baseDir, {
        rickPassword: 'config-secret',
      }));

      const agent = request.agent(app);
      const withConfigPw = await agent
        .post('/u/rick/login').type('form').send({ password: 'config-secret' });
      expect(withConfigPw.status).toBe(401);

      const withEnvPw = await agent
        .post('/u/rick/login').type('form').send({ password: 'env-secret' });
      expect(withEnvPw.status).toBe(302);
    });
  });

  describe('no passwords anywhere (backward compat)', () => {
    test('both users accessible, no redirect', async () => {
      const app = createServer(makeMultiUserConfig(baseDir));
      const r = await request(app).get('/u/rick');
      expect(r.status).toBe(200);
      const l = await request(app).get('/u/leela');
      expect(l.status).toBe(200);
    });
  });
});
