const { loadConfig, saveConfig, initializeConfig, expandPath } = require('../core/config');

/**
 * Service layer for configuration management.
 * Thin wrapper around core/config.js functions.
 */
class ConfigService {
  async load() {
    return loadConfig();
  }

  async save(config) {
    return saveConfig(config);
  }

  async initialize(promptFn) {
    return initializeConfig(promptFn);
  }

  getJournalDir(config) {
    return config.journalDir;
  }

  expandPath(dir) {
    return expandPath(dir);
  }
}

module.exports = { ConfigService };
