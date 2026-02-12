const { expandPath, getDefaultConfig } = require('../lib/core/config');
const os = require('os');
const path = require('path');

describe('Config', () => {
  test('expands tilde paths', () => {
    const expanded = expandPath('~/journals');
    expect(expanded).toBe(path.join(os.homedir(), 'journals'));
  });

  test('returns default config', () => {
    const config = getDefaultConfig();
    expect(config.journalDir).toBeDefined();
    expect(config.localGit).toBe(true);
    expect(config.templates.active).toBe('checkout-v1');
  });
});
