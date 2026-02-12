const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const fsSyncExists = require('fs').existsSync;

const CONFIG_DIR = path.join(os.homedir(), '.checkout');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function getDefaultConfig() {
  return {
    journalDir: path.join(os.homedir(), 'journals'),
    githubRepo: null,
    githubUsername: null,
    autoSync: false,
    localGit: true,
    templates: {
      active: 'checkout-v1'
    },
    createdAt: new Date().toISOString()
  };
}

async function loadConfig() {
  try {
    if (fsSyncExists(CONFIG_FILE)) {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Warning: Could not load config, using defaults');
  }
  return getDefaultConfig();
}

async function saveConfig(config) {
  try {
    if (!fsSyncExists(CONFIG_DIR)) {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
    }
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function expandPath(dir) {
  if (dir.startsWith('~/')) {
    return path.join(os.homedir(), dir.slice(2));
  }
  return path.resolve(dir);
}

async function initializeConfig(promptFn) {
  // If config exists, return it
  if (fsSyncExists(CONFIG_FILE)) {
    return loadConfig();
  }

  // Otherwise, prompt user and create
  const defaults = getDefaultConfig();
  const journalDir = await promptFn('Where should I store journal entries?', defaults.journalDir);

  const config = {
    ...defaults,
    journalDir: expandPath(journalDir)
  };

  const result = await saveConfig(config);
  if (!result.success) {
    throw new Error(`Failed to save config: ${result.error}`);
  }

  return config;
}

module.exports = {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  initializeConfig,
  expandPath,
  CONFIG_FILE,
  CONFIG_DIR
};
