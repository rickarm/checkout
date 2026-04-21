const path = require('path');
const os = require('os');
const express = require('express');
const session = require('express-session');
const { Entry, loadTemplate } = require('../core/entry');
const { saveEntry, readEntry, listEntries } = require('../core/storage');
const { expandPath } = require('../core/config');
const { hasPassword, verifyPassword, isAuthed, setAuthed, clearAuthed } = require('./auth');

// ── Resolve users from config ──────────────────────────────
// Supports new multi-user config (config.users) and falls
// back to single-user mode for backward compatibility.
function resolveUsers(config) {
  if (config.users && Object.keys(config.users).length > 0) {
    const resolved = {};
    for (const [id, u] of Object.entries(config.users)) {
      resolved[id] = {
        ...u,
        journalDir: expandPath(u.journalDir),
        displayName: u.displayName || id.charAt(0).toUpperCase() + id.slice(1),
        theme: u.theme || 'doogie',
        template: u.template || 'checkout-v1',
      };
    }
    return resolved;
  }

  // Single-user fallback — use the root journalDir as "rick"
  return {
    rick: {
      journalDir: expandPath(config.journalDir || path.join(os.homedir(), 'journals')),
      displayName: 'Rick',
      theme: 'doogie',
      template: 'checkout-v1',
    }
  };
}

// ── Session helpers ────────────────────────────────────────
function getUserSession(req, userId) {
  if (!req.session.users) req.session.users = {};
  if (!req.session.users[userId]) {
    req.session.users[userId] = { answers: {}, step: 'breathing' };
  }
  return req.session.users[userId];
}

// ── Build prev/next entry URLs for navigation ──────────────
function buildEntryNavigation(entries, currentFilename, userId) {
  // entries are sorted newest → oldest (by mtime from listEntries)
  const idx = entries.findIndex(e => e.filename === currentFilename);
  if (idx === -1) return { prevUrl: null, nextUrl: null };

  const makeUrl = (entry) => {
    if (!entry) return null;
    const m = entry.filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return `/u/${userId}/history/${m[1]}/${m[2]}/${entry.filename}`;
  };

  return {
    nextUrl: makeUrl(entries[idx - 1]),  // idx-1 = newer
    prevUrl: makeUrl(entries[idx + 1]),  // idx+1 = older
  };
}

function createServer(config) {
  const users = resolveUsers(config);
  const userList = Object.keys(users);

  const app = express();

  // ── View engine ──────────────────────────────────────────
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // ── Middleware ───────────────────────────────────────────
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(session({
    secret: 'checkout-journal-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
  }));

  // ── Landing page ─────────────────────────────────────────
  // If only one user, redirect directly to their journal.
  app.get('/', (req, res) => {
    if (userList.length === 1) {
      return res.redirect(`/u/${userList[0]}`);
    }
    const usersForView = userList.map(id => ({
      id,
      displayName: users[id].displayName,
      theme: users[id].theme,
      locked: hasPassword(id, users[id]) && !isAuthed(req, id),
    }));
    res.render('landing', { users: usersForView });
  });

  // ── User middleware ──────────────────────────────────────
  // Fires for every /u/:user route. Resolves user config and
  // sets res.locals so every template has access to user info.
  app.param('user', (req, res, next, userId) => {
    const userConfig = users[userId];
    if (!userConfig) return res.status(404).send('User not found');
    res.locals.user = userId;
    res.locals.userConfig = userConfig;
    res.locals.userTheme = userConfig.theme;
    res.locals.userName = userConfig.displayName;
    res.locals.hasPassword = hasPassword(userId, userConfig);
    res.locals.allUsers = userList.map(id => ({
      id,
      displayName: users[id].displayName,
    }));
    next();
  });

  // ── Login ────────────────────────────────────────────────
  app.get('/u/:user/login', (req, res) => {
    const userId = req.params.user;
    // No password set → nothing to log into.
    if (!hasPassword(userId, users[userId])) {
      return res.redirect(`/u/${userId}`);
    }
    if (isAuthed(req, userId)) {
      return res.redirect(`/u/${userId}`);
    }
    res.render('login', { error: null });
  });

  app.post('/u/:user/login', (req, res) => {
    const userId = req.params.user;
    const userConfig = users[userId];
    if (!hasPassword(userId, userConfig)) {
      return res.redirect(`/u/${userId}`);
    }
    const submitted = (req.body && req.body.password) || '';
    if (verifyPassword(userId, userConfig, submitted)) {
      setAuthed(req, userId);
      return res.redirect(`/u/${userId}`);
    }
    res.status(401).render('login', { error: 'Incorrect password.' });
  });

  app.post('/u/:user/logout', (req, res) => {
    clearAuthed(req, req.params.user);
    res.redirect('/');
  });

  // ── Auth gate ────────────────────────────────────────────
  // Protects every /u/:user/* route except the login endpoints.
  // Users without a configured password are passed through.
  app.use('/u/:user', (req, res, next) => {
    const userId = req.params.user;
    if (!users[userId]) return next();
    if (req.path === '/login' || req.path === '/logout') return next();
    if (!hasPassword(userId, users[userId])) return next();
    if (isAuthed(req, userId)) return next();
    return res.redirect(`/u/${userId}/login`);
  });

  // ── User root ─────────────────────────────────────────────
  app.get('/u/:user', (req, res) => {
    const sess = getUserSession(req, req.params.user);
    sess.answers = {};
    sess.step = 'breathing';
    res.render('layout', { page: 'breathing', partial: 'breathing' });
  });

  // ── Step: Breathing ───────────────────────────────────────
  app.get('/u/:user/step/breathing', (req, res) => {
    const sess = getUserSession(req, req.params.user);
    sess.answers = {};
    sess.step = 'breathing';
    res.render('breathing');
  });

  // ── Step: Question ────────────────────────────────────────
  app.get('/u/:user/step/question/:index', async (req, res) => {
    const { user } = req.params;
    const index = parseInt(req.params.index);
    const sess = getUserSession(req, user);
    const template = await loadTemplate(res.locals.userConfig.template);
    const questions = template.questions.sort((a, b) => a.order - b.order);

    if (index < 0 || index >= questions.length) {
      return res.render('review', { markdown: null, error: 'Invalid question index' });
    }

    res.render('question', {
      question: questions[index],
      index,
      total: questions.length,
      previousAnswers: sess.answers,
    });
  });

  app.post('/u/:user/step/question/:index', async (req, res) => {
    const { user } = req.params;
    const index = parseInt(req.params.index);
    const sess = getUserSession(req, user);
    const template = await loadTemplate(res.locals.userConfig.template);
    const questions = template.questions.sort((a, b) => a.order - b.order);
    const question = questions[index];

    const answer = req.body.answer || '';
    if (answer || !question.required) {
      sess.answers[question.id] = answer;
    }

    // Validate
    if (question.required && !answer) {
      return res.render('question', {
        question,
        index,
        total: questions.length,
        previousAnswers: sess.answers,
        error: 'This question is required.',
      });
    }

    if (question.type === 'number') {
      const num = parseInt(answer);
      if (isNaN(num) || num < question.min || num > question.max) {
        return res.render('question', {
          question,
          index,
          total: questions.length,
          previousAnswers: sess.answers,
          error: `Please enter a number between ${question.min} and ${question.max}.`,
        });
      }
    }

    const nextIndex = index + 1;
    if (nextIndex < questions.length) {
      return res.render('question', {
        question: questions[nextIndex],
        index: nextIndex,
        total: questions.length,
        previousAnswers: sess.answers,
      });
    }

    // All done → review
    const entry = new Entry(res.locals.userConfig.template);
    for (const [id, val] of Object.entries(sess.answers)) {
      entry.setAnswer(id, val);
    }
    const markdown = await entry.toMarkdown();
    res.render('review', { markdown, error: null });
  });

  // ── Step: Review ──────────────────────────────────────────
  app.get('/u/:user/step/review', async (req, res) => {
    const { user } = req.params;
    const sess = getUserSession(req, user);
    const entry = new Entry(res.locals.userConfig.template);
    for (const [id, val] of Object.entries(sess.answers || {})) {
      entry.setAnswer(id, val);
    }
    const markdown = await entry.toMarkdown();
    res.render('review', { markdown, error: null });
  });

  // ── Step: Save ────────────────────────────────────────────
  app.post('/u/:user/step/save', async (req, res) => {
    const { user } = req.params;
    const sess = getUserSession(req, user);
    const { journalDir, template: templateId } = res.locals.userConfig;

    const entry = new Entry(templateId);
    for (const [id, val] of Object.entries(sess.answers || {})) {
      entry.setAnswer(id, val);
    }

    const validation = await entry.validate();
    if (!validation.valid) {
      const markdown = await entry.toMarkdown();
      return res.render('review', { markdown, error: validation.errors.join(', ') });
    }

    const result = await saveEntry(entry, journalDir, new Date());
    if (!result.success) {
      const markdown = await entry.toMarkdown();
      return res.render('review', { markdown, error: result.error });
    }

    sess.answers = {};
    sess.step = 'breathing';
    res.render('saved', { filePath: result.path });
  });

  // ── History ───────────────────────────────────────────────
  app.get('/u/:user/history', async (req, res) => {
    const { journalDir } = res.locals.userConfig;
    const entries = await listEntries(journalDir);

    const grouped = {};
    for (const entry of entries) {
      const m = entry.filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const [, year, month] = m;
        const key = `${year}-${month}`;
        if (!grouped[key]) grouped[key] = { year, month, entries: [] };
        grouped[key].entries.push(entry);
      }
    }

    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('history', { grouped, total: entries.length });
    }
    res.render('layout', {
      page: 'history',
      partial: 'history',
      grouped,
      total: entries.length,
    });
  });

  // ── Single entry ──────────────────────────────────────────
  app.get('/u/:user/history/:year/:month/:filename', async (req, res) => {
    const { user, year, month, filename } = req.params;
    const { journalDir } = res.locals.userConfig;

    const filePath = path.join(journalDir, year, month, filename);
    const result = await readEntry(filePath);

    // Compute prev/next for navigation
    const allEntries = await listEntries(journalDir);
    const { prevUrl, nextUrl } = buildEntryNavigation(allEntries, filename, user);

    const viewData = {
      content: result.success ? result.content : null,
      filename,
      error: result.success ? null : result.error,
      prevUrl,
      nextUrl,
    };

    const isHtmx = req.headers['hx-request'] === 'true';
    if (isHtmx) {
      return res.render('entry', viewData);
    }
    res.render('layout', { page: 'entry', partial: 'entry', ...viewData });
  });

  // ── API: template ──────────────────────────────────────────
  app.get('/u/:user/api/template', async (req, res) => {
    const template = await loadTemplate(res.locals.userConfig.template);
    res.json(template);
  });

  return app;
}

module.exports = { createServer };
