/**
 * API response serializers.
 *
 * Centralize the mapping from internal adapter/service shapes to the
 * stable API contract. Routes call these instead of shaping responses
 * inline, so the contract stays consistent as storage backends change.
 */

/**
 * Serialize an adapter entry to the EntrySummary shape for list responses.
 *
 * Strips backend-specific fields (filename, path) that are not portable.
 *
 * @param {object} entry - Entry from adapter.listEntries()
 * @returns {{ id: string, date: string, templateId: string, mtime: string }}
 */
function toEntrySummary(entry) {
  return {
    id: entry.id,
    date: entry.date,
    templateId: entry.templateId,
    mtime: entry.mtime
  };
}

/**
 * Serialize an adapter entry to the EntryDetail shape for single-entry responses.
 *
 * Includes sections and metadata but strips source.path (not portable
 * across storage backends — would break when switching to GoogleDriveAdapter).
 *
 * @param {object} entry - Entry from adapter.getEntry()
 * @returns {{ id, date, templateId, markdown, sections, metadata, source: { backend } }}
 */
function toEntryDetail(entry) {
  return {
    id: entry.id,
    date: entry.date,
    templateId: entry.templateId,
    markdown: entry.markdown,
    sections: entry.sections,
    metadata: entry.metadata,
    source: {
      backend: entry.source.backend
    }
  };
}

module.exports = { toEntrySummary, toEntryDetail };
