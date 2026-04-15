const { google } = require('googleapis');
const { StorageAdapter } = require('../storage-adapter');
const { parseEntry } = require('../../domain/markdown');

/**
 * Google Drive storage adapter.
 *
 * Stores journal entries as markdown files in a user's Google Drive folder.
 * Flat folder structure: all files in one folder named by entryId.
 *
 * File naming: YYYY-MM-DD-templateId.md (same as local adapter)
 * Entry identity: entryId = filename stem (e.g. "2026-04-12-checkout-v1")
 *
 * Constructed per-request with an authenticated OAuth2 client and folder ID.
 */
class GoogleDriveAdapter extends StorageAdapter {
  /**
   * @param {object} options
   * @param {import('googleapis').Auth.OAuth2Client} options.auth - Authenticated OAuth2 client
   * @param {string} options.folderId - Google Drive folder ID for this user's entries
   */
  constructor({ auth, folderId }) {
    super();
    this.auth = auth;
    this.folderId = folderId;
    this.drive = google.drive({ version: 'v3', auth });
  }

  async initialize() {
    // Verify folder exists and is accessible
    await this.drive.files.get({
      fileId: this.folderId,
      fields: 'id,name'
    });
  }

  async listEntries(filters = {}) {
    let query = `'${this.folderId}' in parents and trashed=false and mimeType='text/markdown'`;

    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,modifiedTime)',
      orderBy: 'name desc',
      pageSize: 1000
    });

    let entries = (res.data.files || []).map(file => {
      const stem = file.name.replace(/\.md$/, '');
      const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
      return {
        id: stem,
        date: dateMatch ? dateMatch[1] : null,
        templateId: dateMatch ? dateMatch[2] : null,
        driveFileId: file.id,
        mtime: new Date(file.modifiedTime)
      };
    });

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
    const file = await this._findFileByEntryId(entryId);
    if (!file) {
      const err = new Error(`Entry not found: ${entryId}`);
      err.code = 'ENOENT';
      throw err;
    }

    const content = await this._downloadFileContent(file.id);
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
        backend: 'google-drive'
      }
    };
  }

  async saveEntry(entryData, date) {
    const templateId = entryData.templateId || 'checkout-v1';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const filename = `${year}-${month}-${day}-${templateId}.md`;

    const res = await this.drive.files.create({
      requestBody: {
        name: filename,
        mimeType: 'text/markdown',
        parents: [this.folderId]
      },
      media: {
        mimeType: 'text/markdown',
        body: entryData.markdown
      },
      fields: 'id,name,modifiedTime'
    });

    const stem = res.data.name.replace(/\.md$/, '');
    return {
      id: stem,
      mtime: new Date(res.data.modifiedTime)
    };
  }

  async updateEntry(entryId, entryData) {
    const file = await this._findFileByEntryId(entryId);
    if (!file) {
      const err = new Error(`Entry not found: ${entryId}`);
      err.code = 'ENOENT';
      throw err;
    }

    const res = await this.drive.files.update({
      fileId: file.id,
      media: {
        mimeType: 'text/markdown',
        body: entryData.markdown
      },
      fields: 'id,name,modifiedTime'
    });

    return {
      id: entryId,
      mtime: new Date(res.data.modifiedTime)
    };
  }

  async deleteEntry(entryId) {
    const file = await this._findFileByEntryId(entryId);
    if (!file) {
      return { success: false, error: `Entry not found: ${entryId}` };
    }

    await this.drive.files.update({
      fileId: file.id,
      requestBody: { trashed: true }
    });

    return { success: true };
  }

  async entryExists(entryId) {
    const file = await this._findFileByEntryId(entryId);
    return !!file;
  }

  async getConfig() {
    // Config is per-server, not per-user Drive folder
    throw new Error('GoogleDriveAdapter does not support getConfig()');
  }

  async saveConfig() {
    throw new Error('GoogleDriveAdapter does not support saveConfig()');
  }

  async rebuildIndex() {
    // No index.md needed for Drive — files are queryable via API
    return { success: true, entryCount: 0 };
  }

  /**
   * Find a Drive file by entryId (filename stem).
   * @param {string} entryId - e.g. "2026-04-12-checkout-v1"
   * @returns {Promise<{id: string, name: string}|null>}
   */
  async _findFileByEntryId(entryId) {
    const match = entryId.match(/^(\d{4})-(\d{2})-\d{2}-.+$/);
    if (!match) {
      const err = new Error(`Invalid entryId format: ${entryId}`);
      err.message = `Invalid entryId format: ${entryId}`;
      throw err;
    }

    const filename = `${entryId}.md`;
    const res = await this.drive.files.list({
      q: `'${this.folderId}' in parents and name='${filename}' and trashed=false`,
      fields: 'files(id,name)',
      pageSize: 1
    });

    return (res.data.files && res.data.files.length > 0) ? res.data.files[0] : null;
  }

  /**
   * Download file content as text.
   * @param {string} fileId - Google Drive file ID
   * @returns {Promise<string>}
   */
  async _downloadFileContent(fileId) {
    const res = await this.drive.files.get({
      fileId,
      alt: 'media'
    }, {
      responseType: 'text'
    });

    return res.data;
  }
}

module.exports = { GoogleDriveAdapter };
