const path = require('path');
const fs = require('fs').promises;

class Entry {
  constructor(templateId = 'checkout-v1') {
    this.templateId = templateId;
    this.createdAt = new Date().toISOString();
    this.answers = {};
  }

  setAnswer(questionId, answer) {
    this.answers[questionId] = answer;
  }

  getAnswer(questionId) {
    return this.answers[questionId];
  }

  async toMarkdown() {
    const template = await loadTemplate(this.templateId);
    let markdown = '';

    // Iterate through questions in order
    for (const question of template.questions) {
      const answer = this.answers[question.id] || '';
      markdown += `## ${question.title}\n`;
      markdown += `${answer}\n\n`;
    }

    // Add metadata
    markdown += '---\n\n';
    markdown += '**Metadata**\n';
    markdown += `- Created: ${this.createdAt}\n`;
    markdown += `- Template: ${this.templateId}\n`;
    markdown += `- Version: 1.0\n`;

    return markdown;
  }

  // validate() is async so it can load the template definition
  // and check required fields generically across all templates.
  async validate() {
    const errors = [];
    const template = await loadTemplate(this.templateId);

    for (const question of template.questions) {
      const answer = this.answers[question.id];

      if (question.required && !answer) {
        errors.push(`"${question.title}" is required`);
        continue;
      }

      if (answer && question.type === 'number') {
        const num = parseInt(answer);
        if (isNaN(num) || num < question.min || num > question.max) {
          errors.push(`"${question.title}" must be between ${question.min} and ${question.max}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getMetadata() {
    return {
      createdAt: this.createdAt,
      template: this.templateId,
      version: '1.0'
    };
  }
}

async function loadTemplate(templateId) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateId}.json`);
  const data = await fs.readFile(templatePath, 'utf-8');
  return JSON.parse(data);
}

module.exports = { Entry, loadTemplate };
