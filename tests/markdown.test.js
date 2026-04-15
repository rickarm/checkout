const { serializeEntry, parseEntry } = require('../lib/domain/markdown');

// Fixture: a template matching checkout-v1 structure
const testTemplate = {
  id: 'checkout-v1',
  name: 'Evening Checkout',
  questions: [
    { id: 'presence', order: 1, title: 'How present do you feel right now?' },
    { id: 'joy', order: 2, title: 'Your joy-moment' },
    { id: 'values', order: 3, title: 'Think of your values' },
    { id: 'letgo', order: 4, title: 'What do you decide to let go of?' }
  ]
};

// Fixture: a complete entry
const testEntry = {
  templateId: 'checkout-v1',
  createdAt: '2026-02-12T22:00:00.000Z',
  answers: {
    presence: '8',
    joy: 'Morning coffee on the porch',
    values: 'Curiosity: explored a new API at work',
    letgo: 'Worry about the deadline'
  }
};

// Expected markdown output — this is the canonical format
const expectedMarkdown =
  '## How present do you feel right now?\n' +
  '8\n' +
  '\n' +
  '## Your joy-moment\n' +
  'Morning coffee on the porch\n' +
  '\n' +
  '## Think of your values\n' +
  'Curiosity: explored a new API at work\n' +
  '\n' +
  '## What do you decide to let go of?\n' +
  'Worry about the deadline\n' +
  '\n' +
  '---\n' +
  '\n' +
  '**Metadata**\n' +
  '- Created: 2026-02-12T22:00:00.000Z\n' +
  '- Template: checkout-v1\n' +
  '- Version: 1.0\n';

describe('serializeEntry', () => {
  test('produces expected markdown format', () => {
    const result = serializeEntry(testEntry, testTemplate);
    expect(result).toBe(expectedMarkdown);
  });

  test('handles missing answers gracefully', () => {
    const sparseEntry = {
      templateId: 'checkout-v1',
      createdAt: '2026-02-12T22:00:00.000Z',
      answers: { presence: '5' }
    };
    const result = serializeEntry(sparseEntry, testTemplate);
    expect(result).toContain('## How present do you feel right now?\n5\n');
    expect(result).toContain('## Your joy-moment\n\n');
    expect(result).toContain('---\n');
    expect(result).toContain('- Created: 2026-02-12T22:00:00.000Z');
  });
});

describe('parseEntry', () => {
  test('extracts sections from markdown', () => {
    const result = parseEntry(expectedMarkdown);
    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].title).toBe('How present do you feel right now?');
    expect(result.sections[0].content).toBe('8');
    expect(result.sections[1].title).toBe('Your joy-moment');
    expect(result.sections[1].content).toBe('Morning coffee on the porch');
  });

  test('extracts metadata fields', () => {
    const result = parseEntry(expectedMarkdown);
    expect(result.metadata.created).toBe('2026-02-12T22:00:00.000Z');
    expect(result.metadata.template).toBe('checkout-v1');
    expect(result.metadata.version).toBe('1.0');
  });

  test('preserves raw content', () => {
    const result = parseEntry(expectedMarkdown);
    expect(result.raw).toBe(expectedMarkdown);
  });

  test('handles missing metadata gracefully', () => {
    const noMetadata = '## Question\nAnswer\n';
    const result = parseEntry(noMetadata);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('Question');
    expect(result.sections[0].content).toBe('Answer');
    expect(result.metadata.created).toBeNull();
    expect(result.metadata.template).toBeNull();
    expect(result.metadata.version).toBeNull();
  });

  test('handles partial metadata gracefully', () => {
    const partial = '## Q\nA\n\n---\n\n**Metadata**\n- Created: 2026-01-01T00:00:00.000Z\n';
    const result = parseEntry(partial);
    expect(result.metadata.created).toBe('2026-01-01T00:00:00.000Z');
    expect(result.metadata.template).toBeNull();
    expect(result.metadata.version).toBeNull();
  });
});

describe('roundtrip', () => {
  test('serialize then parse preserves structure', () => {
    const markdown = serializeEntry(testEntry, testTemplate);
    const parsed = parseEntry(markdown);

    // Verify sections match original answers
    expect(parsed.sections[0].content).toBe(testEntry.answers.presence);
    expect(parsed.sections[1].content).toBe(testEntry.answers.joy);
    expect(parsed.sections[2].content).toBe(testEntry.answers.values);
    expect(parsed.sections[3].content).toBe(testEntry.answers.letgo);

    // Verify metadata matches original entry
    expect(parsed.metadata.created).toBe(testEntry.createdAt);
    expect(parsed.metadata.template).toBe(testEntry.templateId);
    expect(parsed.metadata.version).toBe('1.0');
  });

  test('markdown output is stable (fixture test)', () => {
    // Serialize twice and verify identical output
    const first = serializeEntry(testEntry, testTemplate);
    const second = serializeEntry(testEntry, testTemplate);
    expect(first).toBe(second);

    // Verify against the canonical expected format
    expect(first).toBe(expectedMarkdown);
  });
});
