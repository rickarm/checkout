const path = require('path');
const fs = require('fs').promises;
const { listEntries, validateFilename } = require('../core/storage');

/**
 * Validate a single entry file
 * @param {string} filePath - Path to the entry file
 * @returns {object} - Validation result with errors/warnings
 */
async function validateEntry(filePath) {
  const errors = [];
  const warnings = [];
  const filename = path.basename(filePath);

  try {
    // Check filename format
    const filenameValidation = validateFilename(filename);
    if (!filenameValidation.valid) {
      errors.push(`Invalid filename format: ${filenameValidation.error}`);
    }

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for metadata section
    if (!content.includes('---')) {
      errors.push('Missing metadata separator (---)');
    }

    if (!content.includes('**Metadata**')) {
      warnings.push('Missing metadata section header');
    }

    // Check for required metadata fields
    const hasCreated = content.includes('- Created:');
    const hasTemplate = content.includes('- Template:');
    const hasVersion = content.includes('- Version:');

    if (!hasCreated) warnings.push('Missing "Created" metadata field');
    if (!hasTemplate) warnings.push('Missing "Template" metadata field');
    if (!hasVersion) warnings.push('Missing "Version" metadata field');

    // Check for question sections (basic validation)
    const hasSections = content.includes('##');
    if (!hasSections) {
      errors.push('No question sections found (missing ##)');
    }

    // Check required questions for checkout-v1 template
    if (filename.includes('checkout-v1')) {
      const requiredSections = [
        'How present do you feel right now?',
        'Your joy-moment',
        'Think of your values'
      ];

      for (const section of requiredSections) {
        if (!content.includes(section)) {
          warnings.push(`Missing required section: "${section}"`);
        }
      }
    }

    // Check file location matches filename date
    const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-/);
    if (match) {
      const [, year, month] = match;
      const expectedPath = path.join(year, month);

      if (!filePath.includes(expectedPath)) {
        warnings.push(`File location doesn't match date (expected in ${expectedPath})`);
      }
    }

    return {
      valid: errors.length === 0,
      filePath,
      filename,
      errors,
      warnings
    };

  } catch (e) {
    return {
      valid: false,
      filePath,
      filename,
      errors: [`Failed to read file: ${e.message}`],
      warnings: []
    };
  }
}

/**
 * Validate all entries in the journal directory
 * @param {string} journalDir - Journal directory to validate
 * @returns {object} - Summary of validation results
 */
async function validateAll(journalDir) {
  try {
    const entries = await listEntries(journalDir);

    if (entries.length === 0) {
      return {
        success: true,
        message: 'No entries found to validate',
        stats: { total: 0, valid: 0, invalid: 0, warnings: 0 }
      };
    }

    const results = {
      total: entries.length,
      valid: 0,
      invalid: 0,
      withWarnings: 0,
      details: []
    };

    // Validate each entry
    for (const entry of entries) {
      const validation = await validateEntry(entry.path);

      if (validation.valid) {
        results.valid++;
        if (validation.warnings.length > 0) {
          results.withWarnings++;
        }
      } else {
        results.invalid++;
      }

      // Only include in details if there are issues
      if (validation.errors.length > 0 || validation.warnings.length > 0) {
        results.details.push(validation);
      }
    }

    return {
      success: true,
      stats: results,
      allValid: results.invalid === 0
    };

  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Quick check if journal directory structure is valid
 * @param {string} journalDir - Journal directory
 * @returns {object} - Structure validation result
 */
async function validateStructure(journalDir) {
  try {
    const fs = require('fs');

    if (!fs.existsSync(journalDir)) {
      return {
        valid: false,
        error: `Journal directory does not exist: ${journalDir}`
      };
    }

    const stat = await require('fs').promises.stat(journalDir);
    if (!stat.isDirectory()) {
      return {
        valid: false,
        error: 'Journal path is not a directory'
      };
    }

    return {
      valid: true,
      path: journalDir
    };

  } catch (e) {
    return {
      valid: false,
      error: e.message
    };
  }
}

module.exports = {
  validateEntry,
  validateAll,
  validateStructure
};
