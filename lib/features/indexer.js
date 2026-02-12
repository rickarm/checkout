const path = require('path');
const fs = require('fs').promises;
const { listEntries } = require('../core/storage');

/**
 * Generate an index.md file with wiki-style links to all journal entries
 * @param {string} journalDir - Journal directory
 * @returns {object} - Result with success status and details
 */
async function generateIndex(journalDir) {
  try {
    const entries = await listEntries(journalDir);

    if (entries.length === 0) {
      return {
        success: false,
        message: 'No entries found to index'
      };
    }

    let markdown = '# Journal Index\n\n';
    markdown += `*${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}*\n\n`;
    markdown += '---\n\n';

    // Group entries by year and month
    const grouped = {};

    for (const entry of entries) {
      // Extract date from filename (YYYY-MM-DD-template.md)
      const match = entry.filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!match) continue;

      const [, year, month, day] = match;
      const yearKey = year;
      const monthKey = `${year}-${month}`;

      // Initialize year
      if (!grouped[yearKey]) {
        grouped[yearKey] = {};
      }

      // Initialize month
      if (!grouped[yearKey][monthKey]) {
        grouped[yearKey][monthKey] = [];
      }

      // Add entry
      grouped[yearKey][monthKey].push({
        year,
        month,
        day,
        filename: entry.filename,
        path: entry.path
      });
    }

    // Sort years descending
    const years = Object.keys(grouped).sort().reverse();

    for (const year of years) {
      markdown += `## ${year}\n\n`;

      // Sort months descending within year
      const months = Object.keys(grouped[year]).sort().reverse();

      for (const monthKey of months) {
        const [, month] = monthKey.split('-');
        const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'long' });

        markdown += `### ${monthName}\n\n`;

        // Sort entries within month (descending)
        const monthEntries = grouped[year][monthKey].sort((a, b) =>
          parseInt(b.day) - parseInt(a.day)
        );

        for (const entry of monthEntries) {
          // Create relative path from journal root
          const relativePath = `./${entry.year}/${entry.month}/${entry.filename}`;

          // Wiki-style link: [[path|display text]]
          // For better compatibility, we'll use markdown link format with relative path
          markdown += `- **${entry.day}** — [[${relativePath}]]\n`;
        }

        markdown += '\n';
      }
    }

    // Add footer
    markdown += '---\n\n';
    markdown += `*Generated: ${new Date().toISOString()}*\n`;

    return {
      success: true,
      markdown,
      entryCount: entries.length
    };

  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Save index.md to journal directory
 * @param {string} journalDir - Journal directory
 * @param {string} markdown - Markdown content to save
 * @returns {object} - Result with success status
 */
async function saveIndex(journalDir, markdown) {
  try {
    const indexPath = path.join(journalDir, 'index.md');
    await fs.writeFile(indexPath, markdown, 'utf-8');

    return {
      success: true,
      path: indexPath
    };
  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Generate and save index.md file
 * @param {string} journalDir - Journal directory
 * @returns {object} - Combined result
 */
async function createIndex(journalDir) {
  const generated = await generateIndex(journalDir);

  if (!generated.success) {
    return generated;
  }

  const saved = await saveIndex(journalDir, generated.markdown);

  if (!saved.success) {
    return saved;
  }

  return {
    success: true,
    path: saved.path,
    entryCount: generated.entryCount
  };
}

module.exports = {
  generateIndex,
  saveIndex,
  createIndex
};
