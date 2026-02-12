const path = require('path');
const fs = require('fs').promises;
const fsSyncExists = require('fs').existsSync;
const { validateFilename } = require('../core/storage');

/**
 * Import a markdown file into the journal directory
 * @param {string} sourcePath - Path to the markdown file to import
 * @param {string} journalDir - Target journal directory
 * @returns {object} - Result with success status and details
 */
async function importFile(sourcePath, journalDir) {
  try {
    // Check if source file exists
    if (!fsSyncExists(sourcePath)) {
      return { success: false, error: 'Source file does not exist' };
    }

    // Check if source is a file (not directory)
    const stat = await fs.stat(sourcePath);
    if (!stat.isFile()) {
      return { success: false, error: 'Source must be a file, not a directory' };
    }

    // Get filename
    const filename = path.basename(sourcePath);

    // Validate filename format
    const validation = validateFilename(filename);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Parse date from filename (YYYY-MM-DD-template.md)
    const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (!match) {
      return { success: false, error: 'Could not parse date from filename' };
    }

    const [, year, month] = match;

    // Create target directory structure
    const targetDir = path.join(journalDir, year, month);
    await fs.mkdir(targetDir, { recursive: true });

    // Build target path
    const targetPath = path.join(targetDir, filename);

    // Check if file already exists
    if (fsSyncExists(targetPath)) {
      return { success: false, error: 'Entry already exists at target location', targetPath };
    }

    // Read source content
    const content = await fs.readFile(sourcePath, 'utf-8');

    // Validate content has basic structure (sections and metadata)
    const hasMetadata = content.includes('---') && content.includes('**Metadata**');
    if (!hasMetadata) {
      return {
        success: false,
        error: 'File does not appear to be a valid checkout entry (missing metadata section)',
        warning: 'You can still copy it manually if needed'
      };
    }

    // Copy file to target location
    await fs.writeFile(targetPath, content, 'utf-8');

    return {
      success: true,
      sourcePath,
      targetPath,
      message: `Imported ${filename} to ${targetPath}`
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Import multiple markdown files from a directory
 * @param {string} sourceDir - Directory containing markdown files
 * @param {string} journalDir - Target journal directory
 * @returns {object} - Result with success/failure counts
 */
async function importDirectory(sourceDir, journalDir) {
  try {
    // Check if source directory exists
    if (!fsSyncExists(sourceDir)) {
      return { success: false, error: 'Source directory does not exist' };
    }

    // Get all .md files in source directory (non-recursive)
    const files = await fs.readdir(sourceDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      return { success: false, error: 'No markdown files found in source directory' };
    }

    const results = {
      total: mdFiles.length,
      imported: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    // Import each file
    for (const file of mdFiles) {
      const sourcePath = path.join(sourceDir, file);
      const result = await importFile(sourcePath, journalDir);

      if (result.success) {
        results.imported++;
        results.details.push({ file, status: 'imported', path: result.targetPath });
      } else if (result.error && result.error.includes('already exists')) {
        results.skipped++;
        results.details.push({ file, status: 'skipped', reason: 'already exists' });
      } else {
        results.failed++;
        results.details.push({ file, status: 'failed', reason: result.error });
      }
    }

    return {
      success: true,
      results
    };

  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  importFile,
  importDirectory
};
