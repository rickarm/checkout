#!/usr/bin/env node

const { ConfigService } = require('../lib/services/config-service');
const { LocalFilesystemAdapter } = require('../lib/storage/adapters/local-filesystem-adapter');
const { JournalService } = require('../lib/services/journal-service');
const { createApiServer } = require('../lib/api/server');

async function main() {
  const configService = new ConfigService();
  const config = await configService.load();
  const adapter = new LocalFilesystemAdapter({ journalDir: config.journalDir });
  const journalService = new JournalService(adapter);

  const app = createApiServer(journalService);
  const port = parseInt(process.env.PORT) || 3001;

  app.listen(port, () => {
    console.log(`Checkout API running on http://localhost:${port}`);
    console.log(`Journal directory: ${config.journalDir}`);
    console.log(`API key auth: ${process.env.CHECKOUT_API_KEY ? 'enabled' : 'disabled'}`);
  });
}

main().catch(err => {
  console.error('Failed to start API server:', err.message);
  process.exit(1);
});
