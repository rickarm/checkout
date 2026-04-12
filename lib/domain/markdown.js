/**
 * Markdown serialization and parsing for journal entries.
 *
 * These are pure functions with no filesystem dependencies.
 * The format follows the existing serialized output exactly:
 *
 *   ## Question Title
 *   Answer text
 *
 *   ## Next Question
 *   Answer text
 *
 *   ---
 *
 *   **Metadata**
 *   - Created: <ISO timestamp>
 *   - Template: <templateId>
 *   - Version: <version>
 */

/**
 * Serialize an entry into markdown using a template for question ordering.
 *
 * @param {object} entry - Entry object with { answers, createdAt, templateId }
 * @param {object} template - Template object with { questions: [{ id, title, order }] }
 * @returns {string} Markdown string
 */
function serializeEntry(entry, template) {
  let markdown = '';

  for (const question of template.questions) {
    const answer = entry.answers[question.id] || '';
    markdown += `## ${question.title}\n`;
    markdown += `${answer}\n\n`;
  }

  markdown += '---\n\n';
  markdown += '**Metadata**\n';
  markdown += `- Created: ${entry.createdAt}\n`;
  markdown += `- Template: ${entry.templateId}\n`;
  markdown += `- Version: 1.0\n`;

  return markdown;
}

/**
 * Parse a journal entry markdown string into structured data.
 *
 * Intentionally minimal: splits on the `---` metadata separator,
 * extracts ## sections and metadata fields. Handles missing fields
 * gracefully (returns null for absent metadata).
 *
 * @param {string} markdownContent - Raw markdown content
 * @returns {{ sections: Array<{ title: string, content: string }>, metadata: object, raw: string }}
 */
function parseEntry(markdownContent) {
  const raw = markdownContent;

  // Split on the --- metadata separator
  // The format is: body content \n---\n\n metadata content
  const separatorIndex = markdownContent.indexOf('\n---\n');
  let body, metadataBlock;

  if (separatorIndex !== -1) {
    body = markdownContent.slice(0, separatorIndex);
    metadataBlock = markdownContent.slice(separatorIndex + 5); // skip \n---\n
  } else {
    body = markdownContent;
    metadataBlock = '';
  }

  // Extract ## sections from the body
  const sections = [];
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const sectionStarts = [];

  while ((match = sectionRegex.exec(body)) !== null) {
    sectionStarts.push({ title: match[1], index: match.index, afterMatch: match.index + match[0].length });
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i];
    const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index : body.length;
    const content = body.slice(start.afterMatch, end).replace(/^\n/, '').replace(/\n+$/, '');
    sections.push({ title: start.title, content });
  }

  // Extract metadata fields — handle missing fields gracefully
  const metadata = {
    created: extractMetadataField(metadataBlock, 'Created'),
    template: extractMetadataField(metadataBlock, 'Template'),
    version: extractMetadataField(metadataBlock, 'Version')
  };

  return { sections, metadata, raw };
}

/**
 * Extract a single metadata field value from a metadata block.
 * Returns null if the field is not found.
 *
 * @param {string} block - The metadata text block
 * @param {string} fieldName - Field name to extract (e.g. "Created")
 * @returns {string|null}
 */
function extractMetadataField(block, fieldName) {
  const regex = new RegExp(`^- ${fieldName}:\\s*(.+)$`, 'm');
  const match = block.match(regex);
  return match ? match[1].trim() : null;
}

module.exports = { serializeEntry, parseEntry };
