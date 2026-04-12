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
