/**
 * Integration tests for the web server (lib/web/server.js).
 * Uses Supertest to exercise HTTP routes and session state
 * without a real browser.
 *
 * Run with: npm test
 */

const request = require('supertest');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { createServer } = require('../lib/web/server');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTestConfig(journalDir) {
  // Single-user fallback mode: no `users` key, just journalDir.
  // resolveUsers() in server.js maps this to user id "rick".
  return { journalDir };
}

// Answers that satisfy all checkout-v1 required questions.
const VALID_ANSWERS = {
  presence: '7',
  joy: 'First coffee of the day',
  values: 'Curiosity: went deep on a client problem',
  letgo: '', // optional — empty is fine
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('Web Server', () => {
  let app;
  let testJournalDir;

  beforeAll(async () => {
    testJournalDir = path.join(os.tmpdir(), `checkout-server-test-${Date.now()}`);
    await fs.mkdir(testJournalDir, { recursive: true });
    app = createServer(makeTestConfig(testJournalDir));
  });

  afterAll(async () => {
    await fs.rm(testJournalDir, { recursive: true, force: true });
  });

  // ── Landing / routing ───────────────────────────────────────────────────────

  describe('GET /', () => {
    test('redirects to /u/rick in single-user mode', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/u\/rick/);
    });
  });

  describe('GET /u/:user', () => {
    test('returns 200 and renders breathing page', async () => {
      const res = await request(app).get('/u/rick');
      expect(res.status).toBe(200);
      expect(res.text).toContain('breathingExercise');
    });

    test('returns 404 for unknown user', async () => {
      const res = await request(app).get('/u/unknown');
      expect(res.status).toBe(404);
    });
  });

  // ── Step: Breathing ─────────────────────────────────────────────────────────

  describe('GET /u/:user/step/breathing', () => {
    test('renders breathing partial', async () => {
      const res = await request(app).get('/u/rick/step/breathing');
      expect(res.status).toBe(200);
      expect(res.text).toContain('step-breathing');
    });

    test('resets session answers on visit', async () => {
      // Prime a session with an answer, then visit breathing to reset.
      const agent = request.agent(app);
      await agent
        .post('/u/rick/step/question/0')
        .send({ answer: '5' });
      await agent.get('/u/rick/step/breathing');
      // After reset, visiting review should show an empty entry.
      const reviewRes = await agent.get('/u/rick/step/review');
      expect(reviewRes.status).toBe(200);
      // The markdown for an empty entry should not contain our previous answer.
      expect(reviewRes.text).not.toContain('presence: 5');
    });
  });

  // ── Step: Question (GET) ────────────────────────────────────────────────────

  describe('GET /u/:user/step/question/:index', () => {
    test('renders first question', async () => {
      const res = await request(app).get('/u/rick/step/question/0');
      expect(res.status).toBe(200);
      expect(res.text).toContain('How present do you feel right now?');
      expect(res.text).toContain('Question 1/');
    });

    test('renders second question', async () => {
      const res = await request(app).get('/u/rick/step/question/1');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Your joy-moment');
      expect(res.text).toContain('Question 2/');
    });

    test('returns error view for out-of-bounds index', async () => {
      const res = await request(app).get('/u/rick/step/question/99');
      expect(res.status).toBe(200);
      // Error is shown in the review partial (server passes it as `error` to the template)
      expect(res.text).toContain('Invalid question index');
    });

    test('presence question renders a numeric input', async () => {
      const res = await request(app).get('/u/rick/step/question/0');
      expect(res.text).toContain('inputmode="numeric"');
    });

    test('text question renders a standard text input', async () => {
      const res = await request(app).get('/u/rick/step/question/1');
      expect(res.text).not.toContain('inputmode="numeric"');
    });
  });

  // ── Step: Question (POST) ───────────────────────────────────────────────────

  describe('POST /u/:user/step/question/:index', () => {
    test('valid presence answer advances to next question', async () => {
      const agent = request.agent(app);
      const res = await agent
        .post('/u/rick/step/question/0')
        .send({ answer: '7' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('Your joy-moment'); // question 1
    });

    test('missing required answer re-renders question with error', async () => {
      const res = await request(app)
        .post('/u/rick/step/question/0')
        .send({ answer: '' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('How present do you feel right now?');
      expect(res.text).toContain('required');
    });

    test('presence rating below range re-renders with error', async () => {
      const res = await request(app)
        .post('/u/rick/step/question/0')
        .send({ answer: '0' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('between 1 and 10');
    });

    test('presence rating above range re-renders with error', async () => {
      const res = await request(app)
        .post('/u/rick/step/question/0')
        .send({ answer: '11' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('between 1 and 10');
    });

    test('non-numeric presence answer re-renders with error', async () => {
      const res = await request(app)
        .post('/u/rick/step/question/0')
        .send({ answer: 'abc' });
      expect(res.status).toBe(200);
      expect(res.text).toContain('between 1 and 10');
    });

    test('optional question can be submitted empty', async () => {
      // Question 3 (index 3) is letgo — optional
      const res = await request(app)
        .post('/u/rick/step/question/3')
        .send({ answer: '' });
      // Should advance to review (no more questions)
      expect(res.status).toBe(200);
      expect(res.text).toContain('review');
    });

    test('answering last question renders review page', async () => {
      const agent = request.agent(app);
      await agent.post('/u/rick/step/question/0').send({ answer: '7' });
      await agent.post('/u/rick/step/question/1').send({ answer: VALID_ANSWERS.joy });
      await agent.post('/u/rick/step/question/2').send({ answer: VALID_ANSWERS.values });
      const res = await agent.post('/u/rick/step/question/3').send({ answer: '' });
      expect(res.status).toBe(200);
      // "Here's your entry:" is rendered via Alpine.js typewriter, not as raw text.
      // Check for the review container and the save action instead.
      expect(res.text).toContain('step-review');
      expect(res.text).toContain('Save this entry?');
    });

    test('session preserves answers across questions', async () => {
      const agent = request.agent(app);
      await agent.post('/u/rick/step/question/0').send({ answer: '8' });
      // Question 1 page should prefill previous answer in hidden field or show it
      const q1res = await agent.get('/u/rick/step/question/0');
      expect(q1res.text).toContain('value="8"');
    });
  });

  // ── Step: Review ────────────────────────────────────────────────────────────

  describe('GET /u/:user/step/review', () => {
    test('renders review with accumulated answers', async () => {
      const agent = request.agent(app);
      await agent.post('/u/rick/step/question/0').send({ answer: '6' });
      await agent.post('/u/rick/step/question/1').send({ answer: 'Sunset walk' });

      const res = await agent.get('/u/rick/step/review');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Sunset walk');
    });
  });

  // ── Step: Save ──────────────────────────────────────────────────────────────

  describe('POST /u/:user/step/save', () => {
    async function completeAllQuestions(agent) {
      await agent.post('/u/rick/step/question/0').send({ answer: VALID_ANSWERS.presence });
      await agent.post('/u/rick/step/question/1').send({ answer: VALID_ANSWERS.joy });
      await agent.post('/u/rick/step/question/2').send({ answer: VALID_ANSWERS.values });
      await agent.post('/u/rick/step/question/3').send({ answer: VALID_ANSWERS.letgo });
    }

    test('saves entry and renders saved page', async () => {
      const agent = request.agent(app);
      await completeAllQuestions(agent);

      const res = await agent.post('/u/rick/step/save').send({});
      expect(res.status).toBe(200);
      expect(res.text).toContain('step-saved');
    });

    test('saved entry file exists in journalDir', async () => {
      const agent = request.agent(app);
      await completeAllQuestions(agent);
      await agent.post('/u/rick/step/save').send({});

      // Walk the journal dir to find the new file
      async function findFiles(dir) {
        let results = [];
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results = results.concat(await findFiles(full));
            else results.push(full);
          }
        } catch { /* dir may not exist yet */ }
        return results;
      }

      const files = await findFiles(testJournalDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);
      expect(mdFiles.some(f => f.includes('checkout-v1'))).toBe(true);
    });

    test('saved file contains the submitted answers', async () => {
      const agent = request.agent(app);
      const uniqueJoy = `joy-${Date.now()}`;
      await agent.post('/u/rick/step/question/0').send({ answer: '9' });
      await agent.post('/u/rick/step/question/1').send({ answer: uniqueJoy });
      await agent.post('/u/rick/step/question/2').send({ answer: VALID_ANSWERS.values });
      await agent.post('/u/rick/step/question/3').send({ answer: '' });
      await agent.post('/u/rick/step/save').send({});

      async function findFiles(dir) {
        let results = [];
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results = results.concat(await findFiles(full));
            else results.push(full);
          }
        } catch { /* empty */ }
        return results;
      }

      const files = await findFiles(testJournalDir);
      let found = false;
      for (const f of files.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(f, 'utf-8');
        if (content.includes(uniqueJoy)) { found = true; break; }
      }
      expect(found).toBe(true);
    });

    test('resets session after save', async () => {
      const agent = request.agent(app);
      await completeAllQuestions(agent);
      await agent.post('/u/rick/step/save').send({});

      // After save, review should show empty/fresh entry
      const reviewRes = await agent.get('/u/rick/step/review');
      expect(reviewRes.text).not.toContain(VALID_ANSWERS.joy);
    });
  });

  // ── History ─────────────────────────────────────────────────────────────────

  describe('GET /u/:user/history', () => {
    test('returns 200', async () => {
      const res = await request(app).get('/u/rick/history');
      expect(res.status).toBe(200);
    });

    test('htmx request returns partial (no full layout)', async () => {
      const res = await request(app)
        .get('/u/rick/history')
        .set('HX-Request', 'true');
      expect(res.status).toBe(200);
      // Partials do not include the outer layout DOCTYPE
      expect(res.text).not.toContain('<!DOCTYPE html>');
    });

    test('full request includes layout', async () => {
      const res = await request(app).get('/u/rick/history');
      expect(res.text).toContain('<!DOCTYPE html>');
    });
  });

  // ── API ──────────────────────────────────────────────────────────────────────

  describe('GET /u/:user/api/template', () => {
    test('returns template JSON', async () => {
      const res = await request(app).get('/u/rick/api/template');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
      const body = JSON.parse(res.text);
      expect(body.id).toBe('checkout-v1');
      expect(Array.isArray(body.questions)).toBe(true);
      expect(body.questions.length).toBe(4);
    });
  });
});
