const { loadTemplate } = require('../core/entry');
const { serializeEntry } = require('../domain/markdown');
const { importFile, importDirectory } = require('../features/importer');
const { validateAll } = require('../features/validator');

/**
 * Service layer for journal operations.
 *
 * Orchestrates storage adapter calls and domain logic.
 * Constructed with a StorageAdapter instance.
 */
class JournalService {
  /**
   * @param {import('../storage/storage-adapter').StorageAdapter} storageAdapter
   */
  constructor(storageAdapter) {
    this.adapter = storageAdapter;
  }

  /**
   * Create and save a new journal entry.
   *
   * @param {object} entry - Entry object with { templateId, createdAt, answers }
   * @param {Date} date - Date for the entry
   * @param {object} [template] - Pre-loaded template (avoids disk read if provided)
   * @returns {Promise<{ id: string, path: string, mtime: Date }>}
   */
  async createEntry(entry, date, template = null) {
    if (!template) {
      template = await this.loadTemplate(entry.templateId);
    }

    const markdown = serializeEntry(entry, template);
    return this.adapter.saveEntry({ markdown, templateId: entry.templateId }, date);
  }

  /**
   * List journal entries with optional filters.
   * @param {object} [filters={}]
   */
  async listEntries(filters = {}) {
    return this.adapter.listEntries(filters);
  }

  /**
   * Get a single entry by ID.
   * @param {string} entryId
   */
  async getEntry(entryId) {
    return this.adapter.getEntry(entryId);
  }

  /**
   * Update an existing journal entry with new answers.
   *
   * Reads the existing entry, maps sections back to question IDs via the
   * template, merges the new answers over the existing ones, re-serializes,
   * and writes back through the adapter.
   *
   * Limitation: section-to-question mapping relies on matching section titles
   * to template question titles. If a markdown file was hand-edited and a
   * section title no longer matches any template question, that section's
   * content will not be included in the reconstructed answers — it is lost
   * on re-serialization. This is acceptable for the current fixed template
   * but would need a more robust mapping strategy (e.g. embedded question IDs)
   * if templates become dynamic.
   *
   * @param {string} entryId - Entry ID (e.g. "2026-04-12-checkout-v1")
   * @param {object} newAnswers - Partial answers to merge (e.g. { presence: "9" })
   * @returns {Promise<{ id: string, path: string, mtime: Date }>}
   */
  async updateEntry(entryId, newAnswers) {
    const existing = await this.adapter.getEntry(entryId);
    const templateId = existing.templateId || 'checkout-v1';
    const template = await this.loadTemplate(templateId);

    // Build a title → questionId map from the template
    const titleToId = {};
    for (const question of template.questions) {
      titleToId[question.title] = question.id;
    }

    // Reconstruct current answers from parsed sections
    const existingAnswers = {};
    for (const section of existing.sections) {
      const questionId = titleToId[section.title];
      if (questionId) {
        existingAnswers[questionId] = section.content;
      }
      // Sections with unrecognized titles are not carried forward.
      // See limitation note above.
    }

    // Merge new answers over existing
    const mergedAnswers = { ...existingAnswers, ...newAnswers };

    // Re-serialize to markdown preserving original metadata
    const entryObj = {
      answers: mergedAnswers,
      createdAt: existing.metadata.created || new Date().toISOString(),
      templateId
    };
    const markdown = serializeEntry(entryObj, template);

    return this.adapter.updateEntry(entryId, { markdown });
  }

  /**
   * Rebuild the journal index.
   */
  async rebuildIndex() {
    return this.adapter.rebuildIndex();
  }

  /**
   * Load a question template by ID.
   * @param {string} [templateId='checkout-v1']
   */
  async loadTemplate(templateId = 'checkout-v1') {
    return loadTemplate(templateId);
  }

  // -----------------------------------------------------------------
  // Phase 1 local-only bridging methods
  //
  // These methods depend on the local filesystem via adapter.journalDir.
  // They are NOT storage-agnostic and will need redesign for
  // non-filesystem backends (e.g. Google Drive).
  // -----------------------------------------------------------------

  /**
   * Import a single markdown file into the journal.
   * Phase 1: local-only — assumes sourcePath is a local filesystem path.
   *
   * @param {string} sourcePath - Local filesystem path to import
   */
  async importFile(sourcePath) {
    return importFile(sourcePath, this.adapter.journalDir);
  }

  /**
   * Import all markdown files from a directory.
   * Phase 1: local-only — assumes sourceDir is a local filesystem path.
   *
   * @param {string} sourceDir - Local filesystem directory to import from
   */
  async importDirectory(sourceDir) {
    return importDirectory(sourceDir, this.adapter.journalDir);
  }

  /**
   * Validate all journal entries.
   * Phase 1: local-only — operates on journalDir directly.
   */
  async validateAll() {
    return validateAll(this.adapter.journalDir);
  }
}

module.exports = { JournalService };
