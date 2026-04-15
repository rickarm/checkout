/**
 * @jest-environment jsdom
 */

// Tests for keyboard shortcut handling in terminal.js

describe('Keyboard Shortcuts', () => {
  let clickedElements;

  beforeEach(() => {
    clickedElements = [];
    document.body.innerHTML = '';

    // Register the keydown handler (mirrors terminal.js logic)
    document.addEventListener('keydown', handler);
  });

  afterEach(() => {
    document.removeEventListener('keydown', handler);
  });

  function handler(e) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const key = e.key.toUpperCase();
    const selector = '.terminal-btn, a.terminal-btn';
    for (const el of document.querySelectorAll(selector)) {
      if (el.offsetParent === null) continue;
      const label = el.textContent.trim();
      if (label.startsWith(`[${key}]`)) {
        e.preventDefault();
        el.click();
        return;
      }
    }
  }

  function addButton(label, { tag = 'button', hidden = false } = {}) {
    const el = document.createElement(tag);
    el.className = 'terminal-btn';
    el.textContent = label;
    // jsdom doesn't implement offsetParent — override it
    Object.defineProperty(el, 'offsetParent', {
      get: () => hidden ? null : document.body,
    });
    el.addEventListener('click', () => clickedElements.push(label));
    document.body.appendChild(el);
    return el;
  }

  function pressKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key,
      bubbles: true,
    }));
  }

  // ── Breathing page shortcuts ───────────────────────────────

  test('[Y] Begin triggers on Y key', () => {
    addButton('[Y] Begin');
    addButton('[R] Repeat');
    pressKey('y');
    expect(clickedElements).toEqual(['[Y] Begin']);
  });

  test('[R] Repeat triggers on R key', () => {
    addButton('[Y] Begin');
    addButton('[R] Repeat');
    pressKey('r');
    expect(clickedElements).toEqual(['[R] Repeat']);
  });

  test('case-insensitive: uppercase Y also works', () => {
    addButton('[Y] Begin');
    pressKey('Y');
    expect(clickedElements).toEqual(['[Y] Begin']);
  });

  // ── Review page shortcuts ──────────────────────────────────

  test('[Y] Save triggers on Y key', () => {
    addButton('[Y] Save');
    addButton('[N] Discard');
    pressKey('y');
    expect(clickedElements).toEqual(['[Y] Save']);
  });

  test('[N] Discard triggers on N key', () => {
    addButton('[Y] Save');
    addButton('[N] Discard');
    pressKey('n');
    expect(clickedElements).toEqual(['[N] Discard']);
  });

  // ── Saved page shortcuts ───────────────────────────────────

  test('[N] New Entry triggers on N key', () => {
    addButton('[N] New Entry', { tag: 'a' });
    addButton('[H] View History', { tag: 'a' });
    pressKey('n');
    expect(clickedElements).toEqual(['[N] New Entry']);
  });

  test('[H] View History triggers on H key', () => {
    addButton('[N] New Entry', { tag: 'a' });
    addButton('[H] View History', { tag: 'a' });
    pressKey('h');
    expect(clickedElements).toEqual(['[H] View History']);
  });

  // ── Question page shortcuts ────────────────────────────────

  test('[S] Skip triggers on S key when input not focused', () => {
    addButton('[Enter] Submit');
    addButton('[S] Skip');
    pressKey('s');
    expect(clickedElements).toEqual(['[S] Skip']);
  });

  test('keys are ignored when input is focused', () => {
    addButton('[Y] Begin');
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    pressKey('y');
    expect(clickedElements).toEqual([]);
  });

  test('keys are ignored when textarea is focused', () => {
    addButton('[Y] Begin');
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    pressKey('y');
    expect(clickedElements).toEqual([]);
  });

  // ── Visibility ─────────────────────────────────────────────

  test('hidden buttons are not triggered', () => {
    addButton('[Y] Begin', { hidden: true });
    addButton('[R] Repeat');
    pressKey('y');
    expect(clickedElements).toEqual([]);
  });

  test('only the first visible match triggers', () => {
    addButton('[Y] Save');
    addButton('[Y] Begin');
    pressKey('y');
    expect(clickedElements).toEqual(['[Y] Save']);
  });

  // ── Unbound keys ───────────────────────────────────────────

  test('unbound keys do nothing', () => {
    addButton('[Y] Begin');
    pressKey('x');
    expect(clickedElements).toEqual([]);
  });

  test('arrow keys do nothing', () => {
    addButton('[Y] Begin');
    pressKey('ArrowUp');
    pressKey('ArrowDown');
    expect(clickedElements).toEqual([]);
  });
});
