const { program } = require('commander');
const { Entry } = require('../core/entry');
const { CONFIG_FILE } = require('../core/config');
const { getEntryPath } = require('../core/storage');
const { runCheckoutFlow, confirmAndSave } = require('./prompts');
const { displaySuccess, displayError, displayInfo, displayWarning } = require('./display');
const { LocalFilesystemAdapter } = require('../storage/adapters/local-filesystem-adapter');
const { JournalService } = require('../services/journal-service');
const { ConfigService } = require('../services/config-service');
const chalk = require('chalk');

/**
 * Bootstrap services for a command handler.
 * Called per-handler; config load is one small JSON file read.
 */
async function getServices() {
  const configService = new ConfigService();
  const config = await configService.load();
  const adapter = new LocalFilesystemAdapter({ journalDir: config.journalDir });
  const journalService = new JournalService(adapter);
  return { configService, journalService, config };
}

program
  .name('checkout')
  .description('Evening reflection journal')
  .version('1.0.0');

// Default command: new checkout
program
  .action(handleCheckout);

// List entries
program
  .command('list')
  .alias('ls')
  .description('View all entries')
  .action(handleList);

// Config
program
  .command('config')
  .description('Show current configuration')
  .option('--set <key> <value>', 'Set a config value')
  .action(handleConfig);

// Import
program
  .command('import <path>')
  .description('Import a markdown file or directory of files into journal')
  .action(handleImport);

// Validate
program
  .command('validate')
  .description('Validate all journal entries for integrity')
  .action(handleValidate);

// Test
program
  .command('test')
  .description('Practice run - create entry without saving')
  .action(handleTest);

// Serve web interface
program
  .command('serve')
  .alias('web')
  .description('Start the web interface')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('--open', 'Open browser automatically')
  .action(handleServe);

async function handleServe(options) {
  try {
    const { config } = await getServices();
    const { createServer } = require('../web/server');
    const app = createServer(config);
    const port = parseInt(options.port) || 3000;

    app.listen(port, () => {
      displaySuccess(`Checkout Journal web interface running`);
      displayInfo(`http://localhost:${port}`);
      console.log(chalk.dim('\nPress Ctrl+C to stop\n'));

      if (options.open) {
        const { exec } = require('child_process');
        const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
        exec(`${cmd} http://localhost:${port}`);
      }
    });
  } catch (e) {
    displayError(`Error: ${e.message}`);
  }
}

async function handleCheckout() {
  try {
    // Load or initialize config
    const configService = new ConfigService();
    let config = await configService.load();
    const configExists = require('fs').existsSync(CONFIG_FILE);

    if (!configExists) {
      console.log(chalk.cyan.bold('\n👋 Welcome to Checkout\n'));
      console.log('No config found. Let me set you up.\n');

      config = await configService.initialize(async (prompt, defaultValue) => {
        const inquirer = require('inquirer');
        const { answer } = await inquirer.prompt([
          {
            type: 'input',
            name: 'answer',
            message: prompt,
            default: defaultValue
          }
        ]);
        return answer;
      });

      displaySuccess('Config saved to ~/.checkout/config.json');
      displaySuccess('Folders created');
    }

    const adapter = new LocalFilesystemAdapter({ journalDir: config.journalDir });
    const journalService = new JournalService(adapter);

    // Load template once for the entire flow
    const template = await journalService.loadTemplate('checkout-v1');

    // Run checkout flow
    const entry = await runCheckoutFlow(Entry, template);
    if (!entry) {
      console.log('\nCheckout cancelled.');
      return;
    }

    // Validate entry
    const validation = entry.validate();
    if (!validation.valid) {
      displayError('Entry validation failed:');
      validation.errors.forEach(e => console.log(`  - ${e}`));
      return;
    }

    // Confirm and save
    const today = new Date();
    const filePath = await getEntryPath(today, 'checkout-v1', config.journalDir);

    const shouldSave = await confirmAndSave(entry, filePath, template);
    if (!shouldSave) {
      console.log('\nEntry not saved.');
      return;
    }

    // Save via service
    const result = await journalService.createEntry(entry, today, template);

    displaySuccess('Entry saved');
    displaySuccess(`Path: ${result.path}`);
    console.log(chalk.cyan('\nDone! 🌙\n'));

  } catch (e) {
    displayError(`Error: ${e.message}`);
    console.error(e);
  }
}

async function handleList() {
  try {
    const { journalService } = await getServices();
    const entries = await journalService.listEntries();

    if (entries.length === 0) {
      displayInfo('No entries found.');
      return;
    }

    console.log(chalk.cyan.bold(`\nJournal (${entries.length} entries)\n`));

    let lastMonth = null;
    for (const entry of entries) {
      // Extract date from filename
      const match = entry.filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        const monthKey = `${year}-${month}`;

        if (lastMonth !== monthKey) {
          lastMonth = monthKey;
          console.log(chalk.gray(`\n${year} — ${new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'long' })}\n`));
        }

        console.log(`  ${day}  ${chalk.dim(entry.filename)}`);
      }
    }

    console.log();

    // Generate index.md file
    console.log(chalk.gray('Generating index.md...'));
    const indexResult = await journalService.rebuildIndex();

    if (indexResult.success) {
      displaySuccess(`Index updated: ${indexResult.path}`);
    } else {
      displayWarning(`Could not generate index: ${indexResult.error || indexResult.message}`);
    }

    console.log();
  } catch (e) {
    displayError(`Error: ${e.message}`);
  }
}

async function handleConfig(options) {
  try {
    const { config } = await getServices();

    if (options.set) {
      displayInfo('Config --set not yet implemented');
      return;
    }

    console.log(chalk.cyan.bold('\nCurrent Configuration\n'));
    console.log(JSON.stringify(config, null, 2));
    console.log();
  } catch (e) {
    displayError(`Error: ${e.message}`);
  }
}

async function handleImport(sourcePath) {
  try {
    const { journalService } = await getServices();
    const fs = require('fs');

    console.log(chalk.cyan.bold('\n📥 Import Journal Entries\n'));

    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      displayError(`Source not found: ${sourcePath}`);
      return;
    }

    // Check if it's a file or directory
    const stat = fs.statSync(sourcePath);

    if (stat.isFile()) {
      // Import single file
      console.log(`Importing file: ${sourcePath}\n`);
      const result = await journalService.importFile(sourcePath);

      if (result.success) {
        displaySuccess('File imported successfully');
        displaySuccess(`Location: ${result.targetPath}`);
      } else {
        displayError(`Import failed: ${result.error}`);
        if (result.warning) {
          displayWarning(result.warning);
        }
      }
    } else if (stat.isDirectory()) {
      // Import directory
      console.log(`Importing from directory: ${sourcePath}\n`);
      const result = await journalService.importDirectory(sourcePath);

      if (result.success) {
        const { results } = result;
        console.log(chalk.cyan.bold('Import Summary:\n'));
        console.log(`  Total files:    ${results.total}`);
        console.log(`  ${chalk.green('✓')} Imported:     ${results.imported}`);
        console.log(`  ${chalk.yellow('⊘')} Skipped:      ${results.skipped}`);
        console.log(`  ${chalk.red('✗')} Failed:       ${results.failed}`);

        // Show details if there are failures
        if (results.failed > 0) {
          console.log(chalk.yellow('\nFailed imports:'));
          results.details
            .filter(d => d.status === 'failed')
            .forEach(d => console.log(`  - ${d.file}: ${d.reason}`));
        }

        console.log();
        if (results.imported > 0) {
          displaySuccess('Import completed');
        }
      } else {
        displayError(`Import failed: ${result.error}`);
      }
    }

  } catch (e) {
    displayError(`Error: ${e.message}`);
    console.error(e);
  }
}

async function handleValidate() {
  try {
    const { journalService, config } = await getServices();

    console.log(chalk.cyan.bold('\n🔍 Validate Journal Entries\n'));
    console.log(`Checking: ${config.journalDir}\n`);

    const result = await journalService.validateAll();

    if (!result.success) {
      displayError(`Validation failed: ${result.error}`);
      return;
    }

    const { stats } = result;

    if (stats.total === 0) {
      displayInfo('No entries found to validate');
      return;
    }

    console.log(chalk.cyan.bold('Validation Summary:\n'));
    console.log(`  Total entries:       ${stats.total}`);
    console.log(`  ${chalk.green('✓')} Valid:             ${stats.valid}`);
    console.log(`  ${chalk.red('✗')} Invalid:           ${stats.invalid}`);
    console.log(`  ${chalk.yellow('⚠')} With warnings:     ${stats.withWarnings}`);

    // Show details if there are issues
    if (stats.details && stats.details.length > 0) {
      console.log(chalk.yellow('\nIssues Found:\n'));

      stats.details.forEach(detail => {
        console.log(chalk.white(`  ${detail.filename}:`));

        if (detail.errors.length > 0) {
          detail.errors.forEach(err => console.log(chalk.red(`    ✗ ${err}`)));
        }

        if (detail.warnings.length > 0) {
          detail.warnings.forEach(warn => console.log(chalk.yellow(`    ⚠ ${warn}`)));
        }

        console.log();
      });
    }

    console.log();

    if (result.allValid) {
      displaySuccess('All entries are valid! ✨');
    } else {
      displayWarning(`Found ${stats.invalid} invalid entries`);
    }

  } catch (e) {
    displayError(`Error: ${e.message}`);
    console.error(e);
  }
}

async function handleTest() {
  try {
    console.log(chalk.cyan.bold('\n🧪 Test Mode\n'));
    console.log(chalk.gray('Practice run - entry will not be saved\n'));

    const { journalService } = await getServices();
    const template = await journalService.loadTemplate('checkout-v1');

    // Run checkout flow
    const entry = await runCheckoutFlow(Entry, template);
    if (!entry) {
      console.log('\nTest cancelled.');
      return;
    }

    // Validate entry
    const validation = entry.validate();
    if (!validation.valid) {
      displayError('Entry validation failed:');
      validation.errors.forEach(e => console.log(`  - ${e}`));
      console.log();
      return;
    }

    // Show the entry preview (same as normal checkout)
    const markdown = await entry.toMarkdown(template);
    console.log('\n\n' + '='.repeat(50));
    console.log('Here\'s your test entry:\n');
    console.log(markdown);
    console.log('='.repeat(50) + '\n');

    displayInfo('Test complete - entry was not saved');
    console.log(chalk.gray('Run "checkout" without "test" to save entries\n'));

  } catch (e) {
    displayError(`Error: ${e.message}`);
    console.error(e);
  }
}

program.parse(process.argv);

module.exports = { program };
