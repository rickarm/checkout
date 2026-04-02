const path = require('path');
const express = require('express');
const session = require('express-session');
const { Entry, loadTemplate } = require('../core/entry');
const { saveEntry, readEntry, listEntries } = require('../core/storage');
const { loadConfig } = require('../core/config');

function createServer(config) {
  const app = express();

  // View engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(session({
    secret: 'checkout-journal-' + Date.now(),
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 30 * 60 * 1000 } // 30 minutes
  }));

  // Initialize session state
  function initSession(req) {
    if (!req.session.checkout) {
      req.session.checkout = { answers: {}, step: 'breathing' };
    }
  }

  // ── Main page ──────────────────────────────────────────────
  app.get('/', async (req, res) => {
    // Reset session for new entry
    req.session.checkout = { answers: {}, step: 'breathing' };
    res.render('layout', { page: 'breathing', partial: 'breathing' });
  });

  // ── Step: Breathing (partial) ──────────────────────────────
  app.get('/step/breathing', (req, res) => {
    initSession(req);
    req.session.checkout.answers = {};
    req.session.checkout.step = 'breathing';
    res.render('breathing');
  });

  // ── Step: Question (partial) ───────────────────────────────
  app.get('/step/question/:index', async (req, res) => {
    initSession(req);
    const index = parseInt(req.params.index);
    const template = await loadTemplate('checkout-v1');
    const questions = template.questions.sort((a, b) => a.order - b.order);

    if (index < 0 || index >= questions.length) {
      return res.render('review', { entry: null, error: 'Invalid question index' });
    }

    const question = questions[index];
    res.render('question', {
      question,
      index,
      total: questions.length,
      previousAnswers: req.session.checkout.answers
    });
  });

  // ── Step: Submit answer, return next step ──────────────────
  app.post('/step/question/:index', async (req, res) => {
    initSession(req);
    const index = parseInt(req.params.index);
    const template = await loadTemplate('checkout-v1');
    const questions = template.questions.sort((a, b) => a.order - b.order);
    const question = questions[index];

    // Store answer
    const answer = req.body.answer || '';
    if (answer || !question.required) {
      req.session.checkout.answers[question.id] = answer;
    }

    // Validate
    if (question.required && !answer) {
      return res.render('question', {
        question,
        index,
        total: questions.length,
        previousAnswers: req.session.checkout.answers,
        error: 'This question is required.'
      });
    }

    if (question.type === 'number') {
      const num = parseInt(answer);
      if (isNaN(num) || num < question.min || num > question.max) {
        return res.render('question', {
          question,
          index,
          total: questions.length,
          previousAnswers: req.session.checkout.answers,
          error: `Please enter a number between ${question.min} and ${question.max}.`
        });
      }
    }

    // Next step
    const nextIndex = index + 1;
    if (nextIndex < questions.length) {
      const nextQuestion = questions[nextIndex];
      return res.render('question', {
        question: nextQuestion,
        index: nextIndex,
        total: questions.length,
        previousAnswers: req.session.checkout.answers
      });
    }

    // All questions answered → review
    const entry = new Entry('checkout-v1');
    for (const [id, val] of Object.entries(req.session.checkout.answers)) {
      entry.setAnswer(id, val);
    }
    const markdown = await entry.toMarkdown();
    res.render('review', { markdown, error: null });
  });

  // ── Step: Review (partial) ─────────────────────────────────
  app.get('/step/review', async (req, res) => {
    initSession(req);
    const entry = new Entry('checkout-v1');
    for (const [id, val] of Object.entries(req.session.checkout.answers || {})) {
      entry.setAnswer(id, val);
    }
    const markdown = await entry.toMarkdown();
    res.render('review', { markdown, error: null });
  });

  // ── Step: Save ─────────────────────────────────────────────
  app.post('/step/save', async (req, res) => {
    initSession(req);
    const answers = req.session.checkout.answers || {};

    const entry = new Entry('checkout-v1');
    for (const [id, val] of Object.entries(answers)) {
      entry.setAnswer(id, val);
    }

    const validation = entry.validate();
    if (!validation.valid) {
      const markdown = await entry.toMarkdown();
      return res.render('review', {
        markdown,
        error: validation.errors.join(', ')
      });
    }

    const today = new Date();
    const result = await saveEntry(entry, config.journalDir, today);

    if (!result.success) {
      const markdown = await entry.toMarkdown();
      return res.render('review', { markdown, error: result.error });
    }

    // Clear session
    req.session.checkout = { answers: {}, step: 'breathing' };
    res.render('saved', { path: result.path });
  });

  // ── History page ───────────────────────────────────────────
  app.get('/history', async (req, res) => {
    const entries = await listEntries(config.journalDir);

    // Group by year/month
    const grouped = {};
    for (const entry of entries) {
      const match = entry.filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month] = match;
        const key = `${year}-${month}`;
        if (!grouped[key]) {
          grouped[key] = { year, month, entries: [] };
        }
        grouped[key].entries.push(entry);
      }
    }

    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('history', { grouped, total: entries.length });
    }
    res.render('layout', { page: 'history', partial: 'history', grouped, total: entries.length });
  });

  // ── View single entry ──────────────────────────────────────
  app.get('/history/:year/:month/:filename', async (req, res) => {
    const { year, month, filename } = req.params;
    const filePath = path.join(config.journalDir, year, month, filename);
    const result = await readEntry(filePath);

    if (!result.success) {
      const isHtmx = req.headers['hx-request'] === 'true';
      if (isHtmx) {
        return res.render('entry', { content: null, filename, error: result.error });
      }
      return res.render('layout', {
        page: 'entry',
        partial: 'entry',
        content: null,
        filename,
        error: result.error
      });
    }

    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('entry', { content: result.content, filename, error: null });
    }
    res.render('layout', {
      page: 'entry',
      partial: 'entry',
      content: result.content,
      filename,
      error: null
    });
  });

  // ── API: template ──────────────────────────────────────────
  app.get('/api/template', async (req, res) => {
    const template = await loadTemplate('checkout-v1');
    res.json(template);
  });

  return app;
}

module.exports = { createServer };
