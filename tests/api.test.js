const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const request = require('supertest');
const { LocalFilesystemAdapter } = require('../lib/storage/adapters/local-filesystem-adapter');
const { JournalService } = require('../lib/services/journal-service');
const { createApiServer } = require('../lib/api/server');

describe('API', () => {
  let app;
  let journalService;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `checkout-api-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    const adapter = new LocalFilesystemAdapter({ journalDir: testDir });
    journalService = new JournalService(adapter);
    app = createApiServer(journalService);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    delete process.env.CHECKOUT_API_KEY;
  });

  describe('GET /api/health', () => {
    test('returns ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/template', () => {
    test('returns checkout-v1 template', async () => {
      const res = await request(app).get('/api/template');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('checkout-v1');
      expect(res.body.questions).toHaveLength(4);
    });
  });

  describe('GET /api/entries', () => {
    test('returns empty array initially', async () => {
      const res = await request(app).get('/api/entries');
      expect(res.status).toBe(200);
      expect(res.body.entries).toEqual([]);
    });

    test('returns entries after creation', async () => {
      await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8', joy: 'Coffee', values: 'Curiosity' } });

      const res = await request(app).get('/api/entries');
      expect(res.status).toBe(200);
      expect(res.body.entries).toHaveLength(1);

      const entry = res.body.entries[0];
      expect(entry.id).toBe('2026-04-12-checkout-v1');
      expect(entry.date).toBe('2026-04-12');
      expect(entry.templateId).toBe('checkout-v1');
      expect(entry).toHaveProperty('mtime');
      // Must NOT include backend-specific fields
      expect(entry).not.toHaveProperty('filename');
      expect(entry).not.toHaveProperty('path');
    });

    test('filters by year', async () => {
      await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8', joy: 'A', values: 'B' } });
      await request(app)
        .post('/api/entries')
        .send({ date: '2025-06-01', answers: { presence: '7', joy: 'C', values: 'D' } });

      const res = await request(app).get('/api/entries?year=2026');
      expect(res.body.entries).toHaveLength(1);
      expect(res.body.entries[0].date).toBe('2026-04-12');
    });
  });

  describe('GET /api/entries/:id', () => {
    test('returns full entry detail', async () => {
      await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8', joy: 'Coffee', values: 'Curiosity', letgo: 'Worry' } });

      const res = await request(app).get('/api/entries/2026-04-12-checkout-v1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('2026-04-12-checkout-v1');
      expect(res.body.date).toBe('2026-04-12');
      expect(res.body.templateId).toBe('checkout-v1');
      expect(res.body.markdown).toContain('## How present do you feel right now?');
      expect(res.body.sections).toHaveLength(4);
      expect(res.body.metadata).toHaveProperty('template', 'checkout-v1');
      expect(res.body.source).toEqual({ backend: 'local-filesystem' });
      // Must NOT include path in source
      expect(res.body.source).not.toHaveProperty('path');
    });

    test('returns 404 for non-existent entry', async () => {
      const res = await request(app).get('/api/entries/2026-04-12-checkout-v1');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Entry not found' });
    });

    test('returns 404 for invalid entry id', async () => {
      const res = await request(app).get('/api/entries/bad-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Entry not found');
    });
  });

  describe('POST /api/entries', () => {
    test('creates entry and returns 201', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({
          date: '2026-04-12',
          templateId: 'checkout-v1',
          answers: { presence: '8', joy: 'Coffee', values: 'Curiosity', letgo: 'Worry' }
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('2026-04-12-checkout-v1');
      expect(res.body.date).toBe('2026-04-12');
      expect(res.body.templateId).toBe('checkout-v1');
      expect(res.body).toHaveProperty('mtime');
    });

    test('defaults templateId to checkout-v1', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8', joy: 'A', values: 'B' } });

      expect(res.status).toBe(201);
      expect(res.body.templateId).toBe('checkout-v1');
    });

    test('returns 400 for missing date', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ answers: { presence: '8', joy: 'A', values: 'B' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('date is required');
      expect(res.body.details).toBeDefined();
    });

    test('returns 400 for missing answers', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('answers is required');
    });

    test('returns 400 for invalid date format', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ date: 'not-a-date', answers: { presence: '8', joy: 'A', values: 'B' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid date format');
    });

    test('returns 400 for missing required answers', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(expect.arrayContaining([
        expect.stringContaining('Joy')
      ]));
    });

    test('returns 400 for presence out of range', async () => {
      const res = await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '15', joy: 'A', values: 'B' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toEqual(expect.arrayContaining([
        expect.stringContaining('1-10')
      ]));
    });
  });

  describe('PATCH /api/entries/:id', () => {
    test('updates answers and returns full entry detail', async () => {
      await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-12', answers: { presence: '8', joy: 'Coffee', values: 'Curiosity', letgo: 'Worry' } });

      const res = await request(app)
        .patch('/api/entries/2026-04-12-checkout-v1')
        .send({ answers: { joy: 'Sunshine' } });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('2026-04-12-checkout-v1');
      expect(res.body.source).toEqual({ backend: 'local-filesystem' });

      // Verify the updated field
      const joySection = res.body.sections.find(s => s.title === 'Your joy-moment');
      expect(joySection.content).toBe('Sunshine');

      // Verify unchanged fields persist
      const presenceSection = res.body.sections.find(s => s.title === 'How present do you feel right now?');
      expect(presenceSection.content).toBe('8');
      const valuesSection = res.body.sections.find(s => s.title === 'Think of your values');
      expect(valuesSection.content).toBe('Curiosity');
    });

    test('updates multiple fields at once preserving unchanged ones', async () => {
      await request(app)
        .post('/api/entries')
        .send({ date: '2026-04-13', answers: { presence: '5', joy: 'Coffee', values: 'Curiosity', letgo: 'Fear' } });

      const res = await request(app)
        .patch('/api/entries/2026-04-13-checkout-v1')
        .send({ answers: { presence: '9', joy: 'Sunshine', letgo: 'Regret' } });

      expect(res.status).toBe(200);
      expect(res.body.sections.find(s => s.title === 'How present do you feel right now?').content).toBe('9');
      expect(res.body.sections.find(s => s.title === 'Your joy-moment').content).toBe('Sunshine');
      expect(res.body.sections.find(s => s.title === 'Think of your values').content).toBe('Curiosity');
      expect(res.body.sections.find(s => s.title === 'What do you decide to let go of?').content).toBe('Regret');
    });

    test('returns 404 for non-existent entry', async () => {
      const res = await request(app)
        .patch('/api/entries/2026-04-12-checkout-v1')
        .send({ answers: { joy: 'X' } });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Entry not found');
    });

    test('returns 400 for empty answers', async () => {
      const res = await request(app)
        .patch('/api/entries/2026-04-12-checkout-v1')
        .send({ answers: {} });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('answers is required');
    });

    test('returns 400 for missing answers field', async () => {
      const res = await request(app)
        .patch('/api/entries/2026-04-12-checkout-v1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('answers is required');
    });
  });

  describe('CORS', () => {
    test('OPTIONS returns 204 with correct headers', async () => {
      const res = await request(app)
        .options('/api/entries')
        .set('Origin', 'https://my-replit-app.replit.dev');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-methods']).toContain('PATCH');
      expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(res.headers['access-control-allow-headers']).toContain('x-api-key');
    });

    test('sets CORS headers on normal responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('API key auth', () => {
    test('returns 401 when key is set but not provided', async () => {
      process.env.CHECKOUT_API_KEY = 'test-secret';
      // Recreate app to pick up env var
      app = createApiServer(journalService);

      const res = await request(app).get('/api/entries');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or missing API key');
    });

    test('returns 401 when wrong key provided', async () => {
      process.env.CHECKOUT_API_KEY = 'test-secret';
      app = createApiServer(journalService);

      const res = await request(app)
        .get('/api/entries')
        .set('x-api-key', 'wrong-key');
      expect(res.status).toBe(401);
    });

    test('allows access with correct key', async () => {
      process.env.CHECKOUT_API_KEY = 'test-secret';
      app = createApiServer(journalService);

      const res = await request(app)
        .get('/api/entries')
        .set('x-api-key', 'test-secret');
      expect(res.status).toBe(200);
    });

    test('allows access when no key is configured', async () => {
      delete process.env.CHECKOUT_API_KEY;
      app = createApiServer(journalService);

      const res = await request(app).get('/api/entries');
      expect(res.status).toBe(200);
    });
  });

  describe('404 handling', () => {
    test('returns 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});
