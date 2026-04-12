/**
 * StorageAdapter — contract for journal entry storage backends.
 *
 * Any adapter (local filesystem, cloud, etc.) must implement all methods
 * defined on this class. Method signatures and return shapes serve as the
 * canonical reference for adapter implementors.
 *
 * ## Phase 1 Transitional Limitations
 *
 * - importer.js still assumes local filesystem paths — not storage-agnostic
 * - validator.js operates on journalDir directly — not storage-agnostic
 * - JournalService importFile, importDirectory, validateAll are local-only
 *   bridging methods that will need redesign for non-filesystem backends
 * - Web server (lib/web/server.js) still uses old modules directly
 * - This contract may evolve when cloud backends are introduced
 * - Entry identity (entryId = filename stem) is a local adapter strategy;
 *   future adapters may use a different identity scheme
 */
class StorageAdapter {
  /**
   * Ensure storage backend is ready (create directories, authenticate, etc.)
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('StorageAdapter.initialize() not implemented');
  }

  /**
   * List journal entries, optionally filtered.
   * @param {object} [filters={}] - Optional filters (e.g. { year, month })
   * @returns {Promise<Array<{
   *   id: string,
   *   date: string,
   *   templateId: string,
   *   filename: string,
   *   path: string,
   *   mtime: Date
   * }>>}
   */
  async listEntries(filters = {}) {
    throw new Error('StorageAdapter.listEntries() not implemented');
  }

  /**
   * Get a single entry by ID.
   *
   * entryId is the filename stem (e.g. "2026-02-12-checkout-v1").
   * This is a local adapter identity strategy — future adapters may
   * use a different scheme. Callers should not assume filename-based
   * identity outside the adapter.
   *
   * @param {string} entryId
   * @returns {Promise<{
   *   id: string,
   *   date: string,
   *   templateId: string,
   *   markdown: string,
   *   sections: Array<{ title: string, content: string }>,
   *   metadata: { created: string|null, template: string|null, version: string|null },
   *   source: { backend: string, path: string }
   * }>}
   */
  async getEntry(entryId) {
    throw new Error('StorageAdapter.getEntry() not implemented');
  }

  /**
   * Save a new entry.
   * @param {object} entryData - Object with { markdown, templateId }
   * @param {Date} date - Date for the entry
   * @returns {Promise<{ id: string, path: string, mtime: Date }>}
   */
  async saveEntry(entryData, date) {
    throw new Error('StorageAdapter.saveEntry() not implemented');
  }

  /**
   * Update an existing entry.
   * @param {string} entryId
   * @param {object} entryData - Object with { markdown }
   * @returns {Promise<{ id: string, path: string, mtime: Date }>}
   */
  async updateEntry(entryId, entryData) {
    throw new Error('StorageAdapter.updateEntry() not implemented');
  }

  /**
   * Delete an entry.
   * @param {string} entryId
   * @returns {Promise<{ success: boolean }>}
   */
  async deleteEntry(entryId) {
    throw new Error('StorageAdapter.deleteEntry() not implemented');
  }

  /**
   * Check if an entry exists.
   * @param {string} entryId
   * @returns {Promise<boolean>}
   */
  async entryExists(entryId) {
    throw new Error('StorageAdapter.entryExists() not implemented');
  }

  /**
   * Load configuration.
   * @returns {Promise<object>} Config object
   */
  async getConfig() {
    throw new Error('StorageAdapter.getConfig() not implemented');
  }

  /**
   * Save configuration.
   * @param {object} config
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async saveConfig(config) {
    throw new Error('StorageAdapter.saveConfig() not implemented');
  }

  /**
   * Rebuild the journal index.
   * @returns {Promise<{ success: boolean, path?: string, entryCount?: number }>}
   */
  async rebuildIndex() {
    throw new Error('StorageAdapter.rebuildIndex() not implemented');
  }
}

module.exports = { StorageAdapter };
