const readline = require('readline');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { displayTimer, formatQuestion, displayWarning } = require('./display');
const { loadTemplate } = require('../core/entry');

async function breathingExercise() {
  console.log('\nTake a moment to breathe.');
  console.log('4 seconds in... 4 seconds out.\n');

  await displayTimer(8);

  const { ready } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ready',
      message: 'Ready?',
      default: true
    }
  ]);

  return ready;
}

async function getTextInput() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question('> ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function askQuestion(question) {
  console.log(formatQuestion(question));
  console.log('');

  let valid = false;
  let answer = null;

  while (!valid) {
    let response;

    if (question.type === 'number') {
      const { resp } = await inquirer.prompt([
        {
          type: 'input',
          name: 'resp',
          message: 'Your answer:',
          default: '',
          prefix: ''
        }
      ]);
      response = resp;
    } else {
      response = await getTextInput();
    }

    // Validate
    if (question.required && !response) {
      displayWarning('This question is required. Please provide an answer.');
      continue;
    }

    if (question.type === 'number') {
      const num = parseInt(response);
      if (isNaN(num) || num < question.min || num > question.max) {
        displayWarning(`Please enter a number between ${question.min} and ${question.max}`);
        continue;
      }
      answer = num;
    } else {
      answer = response;
    }

    valid = true;
  }

  return answer;
}

async function runCheckoutFlow(Entry, template = null) {
  console.log(chalk.cyan.bold('\n🌙 Evening Checkout\n'));

  // Breathing
  const ready = await breathingExercise();
  if (!ready) {
    return null;
  }

  // Load template if not provided
  if (!template) {
    template = await loadTemplate('checkout-v1');
  }

  // Create entry
  const entry = new Entry(template.id || 'checkout-v1');

  // Ask questions in order
  const sortedQuestions = template.questions.sort((a, b) => a.order - b.order);
  for (const question of sortedQuestions) {
    const answer = await askQuestion(question);
    entry.setAnswer(question.id, answer);
  }

  return entry;
}

async function confirmAndSave(entry, path, template = null) {
  const markdown = await entry.toMarkdown(template);

  console.log('\n\n' + '='.repeat(50));
  console.log('Here\'s your entry:\n');
  console.log(markdown);
  console.log('='.repeat(50) + '\n');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Save to ${path}?`,
      default: true
    }
  ]);

  return confirm;
}

module.exports = {
  breathingExercise,
  askQuestion,
  runCheckoutFlow,
  confirmAndSave
};
