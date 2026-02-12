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

  validate() {
    const errors = [];

    // Check required questions
    if (!this.answers['presence']) {
      errors.push('Presence rating is required');
    } else {
      const presence = parseInt(this.answers['presence']);
      if (presence < 1 || presence > 10) {
        errors.push('Presence must be 1-10');
      }
    }

    if (!this.answers['joy']) {
      errors.push('Joy moment is required');
    }

    if (!this.answers['values']) {
      errors.push('Values reflection is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
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
