const express = require('express');
const { Entry } = require('../../core/entry');
const { parseLocalDate } = require('../../utils/date');
const { toEntrySummary, toEntryDetail } = require('../serializers');

/**
 * Create the entries router.
 *
 * @param {import('../../services/journal-service').JournalService} [injectedService]
 *   Optional service for single-user mode. In multi-user mode, the
 *   per-request user-service middleware attaches req.journalService instead.
 * @returns {express.Router}
 */
function createEntriesRouter(injectedService) {
  const router = express.Router();

  /**
   * Resolve the JournalService for this request.
   * Multi-user mode: req.journalService (set by user-service middleware)
   * Single-user mode: injectedService (passed at server creation)
   */
  function getService(req) {
    return req.journalService || injectedService;
  }

  // GET / — list entry summaries
  router.get('/', async (req, res) => {
    const journalService = getService(req);
    const filters = {};
    if (req.query.year) filters.year = req.query.year;
    if (req.query.month) filters.month = req.query.month;
    if (req.query.templateId) filters.templateId = req.query.templateId;

    const entries = await journalService.listEntries(filters);
    res.json({ entries: entries.map(toEntrySummary) });
  });

  // GET /:id — get single entry detail
  router.get('/:id', async (req, res) => {
    const journalService = getService(req);
    try {
      const entry = await journalService.getEntry(req.params.id);
      res.json(toEntryDetail(entry));
    } catch (err) {
      if (err.code === 'ENOENT' || err.message.includes('Invalid entryId')) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      throw err;
    }
  });

  // POST / — create new entry
  router.post('/', async (req, res) => {
    const journalService = getService(req);
    const { date, templateId = 'checkout-v1', answers } = req.body;

    // Validate request body
    if (!date) {
      return res.status(400).json({ error: 'date is required', details: ['Missing date field (YYYY-MM-DD)'] });
    }
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers is required', details: ['Missing answers object'] });
    }

    // Parse date safely
    let dateObj;
    try {
      dateObj = parseLocalDate(date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date format', details: [err.message] });
    }

    // Build Entry and validate
    const entry = new Entry(templateId);
    for (const [key, value] of Object.entries(answers)) {
      entry.setAnswer(key, String(value));
    }

    const validation = entry.validate();
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const result = await journalService.createEntry(entry, dateObj);

    // Extract date parts from the result id for the response
    const idMatch = result.id.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    res.status(201).json({
      id: result.id,
      date: idMatch ? idMatch[1] : date,
      templateId: idMatch ? idMatch[2] : templateId,
      mtime: result.mtime
    });
  });

  // PATCH /:id — update existing entry
  router.patch('/:id', async (req, res) => {
    const journalService = getService(req);
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return res.status(400).json({ error: 'answers is required', details: ['Provide at least one answer to update'] });
    }

    // Verify entry exists
    try {
      await journalService.getEntry(req.params.id);
    } catch (err) {
      if (err.code === 'ENOENT' || err.message.includes('Invalid entryId')) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      throw err;
    }

    // Update via service
    await journalService.updateEntry(req.params.id, answers);

    // Always re-fetch to return fresh, consistent data
    const updated = await journalService.getEntry(req.params.id);
    res.json(toEntryDetail(updated));
  });

  return router;
}

module.exports = { createEntriesRouter };
