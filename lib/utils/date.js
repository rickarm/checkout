/**
 * Parse a YYYY-MM-DD date string into a local-time Date object.
 *
 * Avoids new Date(string) which parses as UTC midnight and can
 * shift the date backward in negative-offset timezones.
 *
 * @param {string} dateString - Date in "YYYY-MM-DD" format
 * @returns {Date} Local-time Date object
 * @throws {Error} If dateString is not valid YYYY-MM-DD
 */
function parseLocalDate(dateString) {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date format: "${dateString}" (expected YYYY-MM-DD)`);
  }
  const [, yearStr, monthStr, dayStr] = match;
  return new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
}

module.exports = { parseLocalDate };
