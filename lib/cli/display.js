const chalk = require('chalk');

function formatQuestion(question) {
  let output = chalk.cyan.bold(`\n${question.title}\n`);
  output += chalk.white(`${question.prompt}\n`);

  if (question.example) {
    output += chalk.gray(`💡 ${question.example}\n`);
  }

  return output;
}

function displaySuccess(message) {
  console.log(chalk.green(`✓ ${message}`));
}

function displayError(message) {
  console.log(chalk.red(`✗ ${message}`));
}

function displayWarning(message) {
  console.log(chalk.yellow(`⚠ ${message}`));
}

function displayInfo(message) {
  console.log(chalk.blue(`ℹ ${message}`));
}

function formatEntry(markdown) {
  return chalk.white(markdown);
}

async function displayTimer(seconds) {
  return new Promise((resolve) => {
    let remaining = seconds;
    const interval = setInterval(() => {
      process.stdout.write(`\r${remaining}s `);
      remaining--;
      if (remaining < 0) {
        clearInterval(interval);
        process.stdout.write('\r✓\n');
        resolve();
      }
    }, 1000);
  });
}

module.exports = {
  formatQuestion,
  displaySuccess,
  displayError,
  displayWarning,
  displayInfo,
  formatEntry,
  displayTimer
};
