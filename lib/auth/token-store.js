/**
 * PostgreSQL-backed token storage for Google Drive OAuth tokens.
 *
 * Stores userId → refreshToken + folderId mappings. This is the only
 * data in PostgreSQL — journal content lives in Google Drive as markdown.
 */
class TokenStore {
  /**
   * @param {import('pg').Pool} pool - PostgreSQL connection pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create the user_tokens table if it doesn't exist.
   */
  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        user_id TEXT PRIMARY KEY,
        google_refresh_token TEXT NOT NULL,
        google_drive_folder_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  /**
   * Get a user's stored token and folder ID.
   * @param {string} userId - Clerk user ID
   * @returns {Promise<{refreshToken: string, folderId: string}|null>}
   */
  async getToken(userId) {
    const result = await this.pool.query(
      'SELECT google_refresh_token, google_drive_folder_id FROM user_tokens WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) return null;

    return {
      refreshToken: result.rows[0].google_refresh_token,
      folderId: result.rows[0].google_drive_folder_id
    };
  }

  /**
   * Save or update a user's token and folder ID.
   * @param {string} userId - Clerk user ID
   * @param {object} data
   * @param {string} data.refreshToken - Google OAuth refresh token
   * @param {string} data.folderId - Google Drive folder ID
   */
  async saveToken(userId, { refreshToken, folderId }) {
    await this.pool.query(`
      INSERT INTO user_tokens (user_id, google_refresh_token, google_drive_folder_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        google_refresh_token = EXCLUDED.google_refresh_token,
        google_drive_folder_id = EXCLUDED.google_drive_folder_id,
        updated_at = NOW()
    `, [userId, refreshToken, folderId]);
  }

  /**
   * Delete a user's stored token (disconnect Drive).
   * @param {string} userId - Clerk user ID
   */
  async deleteToken(userId) {
    await this.pool.query(
      'DELETE FROM user_tokens WHERE user_id = $1',
      [userId]
    );
  }
}

module.exports = { TokenStore };
