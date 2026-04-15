/**
 * Starts the checkout web server on a fixed port for Playwright E2E tests.
 * Uses a temp directory as the journal dir so tests never touch real data.
 *
 * Playwright's webServer config runs this as a child process and waits for
 * the "ready" log line before starting tests.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const { createServer } = require('../../lib/web/server');

const PORT = 4321;

const testJournalDir = path.join(os.tmpdir(), `checkout-e2e-${Date.now()}`);
fs.mkdirSync(testJournalDir, { recursive: true });

const config = { journalDir: testJournalDir };
const app = createServer(config);

app.listen(PORT, () => {
  // Playwright watches stdout for this exact string
  console.log(`Test server ready on http://localhost:${PORT}`);
});

// Clean up temp dir on exit
process.on('exit', () => {
  fs.rmSync(testJournalDir, { recursive: true, force: true });
});
