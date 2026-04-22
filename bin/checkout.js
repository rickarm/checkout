#!/usr/bin/env node

// Load env vars from .env files before anything else requires config.
// Priority (first definition wins): shell env > ./.env > ~/.checkout/.env.
// Missing files are silently ignored.
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(process.cwd(), '.env'), quiet: true });
dotenv.config({ path: path.join(os.homedir(), '.checkout', '.env'), quiet: true });

require('../lib/cli/commands.js');
