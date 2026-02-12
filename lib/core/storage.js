const path = require('path');
const fs = require('fs').promises;
const fsSyncExists = require('fs').existsSync;

async function getEntryPath(date, templateId = 'checkout-v1', journalDir) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}`;
  const filename = `${dateStr}-${templateId}.md`;

  return path.join(journalDir, String(year), month, filename);
}

async function createFolderStructure(journalDir) {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const yearMonthPath = path.join(journalDir, String(year), month);

    await fs.mkdir(yearMonthPath, { recursive: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function saveEntry(entry, journalDir, date = new Date()) {
  try {
    // Create folders
    const folderResult = await createFolderStructure(journalDir);
    if (!folderResult.success) {
      throw new Error(folderResult.error);
    }

    // Get path
    const filePath = await getEntryPath(date, entry.templateId, journalDir);

    // Convert to markdown
    const markdown = await entry.toMarkdown();

    // Write file
    await fs.writeFile(filePath, markdown, 'utf-8');

    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function readEntry(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Parse markdown (simple split on ---)
    const [markdown, metadataBlock] = content.split('---');
    // Note: This is simplified; full parsing would extract questions/answers
    return { success: true, content, markdown, metadata: metadataBlock };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function listEntries(journalDir) {
  try {
    const entries = [];

    const walkDir = async (dir) => {
      if (!fsSyncExists(dir)) return;

      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          await walkDir(fullPath);
        } else if (file.name.endsWith('.md')) {
          const stat = await fs.stat(fullPath);
          entries.push({
            path: fullPath,
            filename: file.name,
            mtime: stat.mtime
          });
        }
      }
    };

    await walkDir(journalDir);

    // Sort by date descending
    entries.sort((a, b) => b.mtime - a.mtime);

    return entries;
  } catch (e) {
    console.error('Error listing entries:', e.message);
    return [];
  }
}

function validateFilename(filename) {
  // Pattern: YYYY-MM-DD-{templateId}.md
  const pattern = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
  const valid = pattern.test(filename);

  return {
    valid,
    error: valid ? null : 'Filename must match YYYY-MM-DD-{templateId}.md'
  };
}

module.exports = {
  getEntryPath,
  createFolderStructure,
  saveEntry,
  readEntry,
  listEntries,
  validateFilename
};
