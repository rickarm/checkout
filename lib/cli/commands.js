const { program } = require('commander');
const { Entry } = require('../core/entry');
const { loadConfig, initializeConfig, CONFIG_FILE } = require('../core/config');
const { saveEntry, listEntries, getEntryPath } = require('../core/storage');
const { runCheckoutFlow, confirmAndSave } = require('./prompts');
const { displaySuccess, displayError, displayInfo } = require('./display');
const chalk = require('chalk');

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

async function handleCheckout() {
  try {
    // Load or initialize config
    let config = await loadConfig();
    const configExists = require('fs').existsSync(CONFIG_FILE);

    if (!configExists) {
      console.log(chalk.cyan.bold('\n👋 Welcome to Checkout\n'));
      console.log('No config found. Let me set you up.\n');

      config = await initializeConfig(async (prompt, defaultValue) => {
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

    // Run checkout flow
    const entry = await runCheckoutFlow(Entry);
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

    const shouldSave = await confirmAndSave(entry, filePath);
    if (!shouldSave) {
      console.log('\nEntry not saved.');
      return;
    }

    // Save
    const result = await saveEntry(entry, config.journalDir, today);
    if (!result.success) {
      displayError(`Failed to save: ${result.error}`);
      return;
    }

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
    const config = await loadConfig();
    const entries = await listEntries(config.journalDir);

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
  } catch (e) {
    displayError(`Error: ${e.message}`);
  }
}

async function handleConfig(options) {
  try {
    const config = await loadConfig();

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

program.parse(process.argv);

module.exports = { program };
