const path = require('path');
const fs = require('fs').promises;
const { StorageAdapter } = require('../storage-adapter');
const { getEntryPath, createFolderStructure, listEntries: listEntriesRaw, validateFilename } = require('../../core/storage');
const { loadConfig, saveConfig } = require('../../core/config');
const { createIndex } = require('../../features/indexer');
const { parseEntry } = require('../../domain/markdown');

/**
 * Local filesystem storage adapter.
 *
 * Delegates to existing core modules for file I/O, wrapping their
 * return values to match the StorageAdapter contract.
 */
class LocalFilesystemAdapter extends StorageAdapter {
  /**
   * @param {object} options
   * @param {string} options.journalDir - Absolute path to journal directory
   * @param {string} [options.configDir] - Absolute path to config directory (unused; config module handles its own paths)
   */
  constructor({ journalDir, configDir } = {}) {
    super();
    this.journalDir = journalDir;
    this.configDir = configDir;
  }

  async initialize() {
    await createFolderStructure(this.journalDir);
  }

  async listEntries(filters = {}) {
    const raw = await listEntriesRaw(this.journalDir);

    let entries = raw.map(entry => {
      const stem = entry.filename.replace(/\.md$/, '');
      const dateMatch = entry.filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      return {
        id: stem,
        date: dateMatch ? dateMatch[1] : null,
        templateId: dateMatch ? dateMatch[2] : null,
        filename: entry.filename,
        path: entry.path,
        mtime: entry.mtime
      };
    });

    // Apply optional filters
    if (filters.year) {
      entries = entries.filter(e => e.date && e.date.startsWith(filters.year));
    }
    if (filters.month) {
      const monthPrefix = filters.year ? `${filters.year}-${filters.month}` : `-${filters.month}-`;
      entries = entries.filter(e => e.date && e.date.startsWith(monthPrefix));
    }
    if (filters.templateId) {
      entries = entries.filter(e => e.templateId === filters.templateId);
    }

    return entries;
  }

  async getEntry(entryId) {
    const filePath = this._resolveEntryPath(entryId);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseEntry(content);

    const dateMatch = entryId.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);

    return {
      id: entryId,
      date: dateMatch ? dateMatch[1] : null,
      templateId: dateMatch ? dateMatch[2] : null,
      markdown: content,
      sections: parsed.sections,
      metadata: parsed.metadata,
      source: {
        backend: 'local-filesystem',
        path: filePath
      }
    };
  }

  async saveEntry(entryData, date) {
    const templateId = entryData.templateId || 'checkout-v1';

    // Ensure directory exists for this date
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dirPath = path.join(this.journalDir, String(year), month);
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = await getEntryPath(date, templateId, this.journalDir);
    await fs.writeFile(filePath, entryData.markdown, 'utf-8');

    const stat = await fs.stat(filePath);
    const stem = path.basename(filePath, '.md');

    return { id: stem, path: filePath, mtime: stat.mtime };
  }

  async updateEntry(entryId, entryData) {
    const filePath = this._resolveEntryPath(entryId);
    await fs.writeFile(filePath, entryData.markdown, 'utf-8');

    const stat = await fs.stat(filePath);
    return { id: entryId, path: filePath, mtime: stat.mtime };
  }

  async deleteEntry(entryId) {
    const filePath = this._resolveEntryPath(entryId);
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async entryExists(entryId) {
    const filePath = this._resolveEntryPath(entryId);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getConfig() {
    return loadConfig();
  }

  async saveConfig(config) {
    return saveConfig(config);
  }

  async rebuildIndex() {
    return createIndex(this.journalDir);
  }

  /**
   * Resolve an entryId to a filesystem path.
   *
   * entryId format: "YYYY-MM-DD-templateId"
   * Resolves to: journalDir/YYYY/MM/YYYY-MM-DD-templateId.md
   *
   * This is a local adapter identity strategy. Future adapters
   * may resolve entry IDs differently.
   *
   * @param {string} entryId
   * @returns {string} Absolute file path
   */
  _resolveEntryPath(entryId) {
    const match = entryId.match(/^(\d{4})-(\d{2})-\d{2}-.+$/);
    if (!match) {
      throw new Error(`Invalid entryId format: ${entryId}`);
    }
    const [, year, month] = match;
    return path.join(this.journalDir, year, month, `${entryId}.md`);
  }
}

module.exports = { LocalFilesystemAdapter };
