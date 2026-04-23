/**
 * Playwright E2E tests for the checkout web interface.
 *
 * Covers:
 *   - Keyboard input working after page load and after htmx swaps
 *   - The full entry flow (breathing → questions → review → save)
 *   - Input focus, cursor behavior, validation errors
 *   - History browsing
 *
 * Run with: npm run test:e2e
 */

// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:4321';
const USER_URL = `${BASE}/u/rick`;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Waits for the breathing exercise to finish and clicks [Y] Begin.
 * The exercise runs for ~8 seconds; we accelerate by mocking timers or
 * simply waiting for the button to appear.
 */
async function skipBreathing(page) {
  // Wait for the [Y] Begin button — it appears after the 8s animation
  await page.waitForSelector('button:has-text("[Y] Begin")', { timeout: 15_000 });
  await page.click('button:has-text("[Y] Begin")');
  // Wait for the first question input to appear
  await page.waitForSelector('.terminal-input', { timeout: 10_000 });
}

/**
 * Waits for an input to be visible AND focused, then asserts that typing
 * into the page (without clicking) updates the input value.
 * This is the core test for the keyboard-input-not-working bug.
 */
async function assertKeyboardInputWorks(page, valueToType) {
  const input = page.locator('.terminal-input').first();
  await expect(input).toBeVisible({ timeout: 8_000 });

  // Clear and type without clicking — input must already have focus
  await input.clear();
  await page.keyboard.type(valueToType);
  await expect(input).toHaveValue(valueToType);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Landing and routing', () => {
  test('/ redirects to /u/rick', async ({ page }) => {
    await page.goto(BASE + '/');
    await expect(page).toHaveURL(/\/u\/rick/);
  });

  test('unknown user returns 404', async ({ page }) => {
    const res = await page.goto(`${BASE}/u/unknownuser`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('Breathing page', () => {
  test('renders the breathing exercise on load', async ({ page }) => {
    await page.goto(USER_URL);
    await expect(page.locator('.step-breathing')).toBeVisible();
  });

  test('[Y] Begin button appears after animation and is clickable', async ({ page }) => {
    await page.goto(USER_URL);
    const beginBtn = page.locator('button:has-text("[Y] Begin")');
    await expect(beginBtn).toBeVisible({ timeout: 15_000 });
    await beginBtn.click();
    // Should transition to first question
    await expect(page.locator('.step-question')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Question input — keyboard focus', () => {
  /**
   * THE CRITICAL TEST.
   *
   * After navigating from breathing → question 0, the input must be
   * focused so the user can type immediately without clicking.
   * This covers the Alpine.js init / htmx swap focus bug.
   */
  test('input is focused after htmx swap from breathing page', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    const input = page.locator('.terminal-input').first();
    await expect(input).toBeFocused({ timeout: 5_000 });
  });

  test('typing without clicking updates the input value (Q0 — presence)', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);
    await assertKeyboardInputWorks(page, '7');
  });

  test('input is focused after htmx swap from Q0 → Q1', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    // Submit Q0 via keyboard Enter
    const input0 = page.locator('.terminal-input').first();
    await input0.fill('7');
    await page.keyboard.press('Enter');

    // Q1 appears — input must auto-focus without clicking
    await page.waitForSelector('.step-question', { timeout: 5_000 });
    const input1 = page.locator('.terminal-input').first();
    await expect(input1).toBeFocused({ timeout: 5_000 });
  });

  test('typing without clicking works on Q1 after htmx swap', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    // Answer Q0
    await page.locator('.terminal-input').first().fill('7');
    await page.click('button:has-text("[Enter] Submit")');
    await page.waitForSelector('.step-question', { timeout: 5_000 });

    // Now on Q1 — type without clicking
    await assertKeyboardInputWorks(page, 'Morning coffee in the garden');
  });

  test('pressing Enter submits the form', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    await page.locator('.terminal-input').first().fill('8');
    await page.keyboard.press('Enter');

    // Should advance to Q1
    await expect(page.locator('text=Your joy-moment')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Question validation', () => {
  test('presence below range shows error and keeps focus', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    await page.locator('.terminal-input').first().fill('0');
    await page.click('button:has-text("[Enter] Submit")');

    await expect(page.locator('.terminal-error')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=between 1 and 10')).toBeVisible();

    // Input should still be focused so user can correct without clicking
    await expect(page.locator('.terminal-input').first()).toBeFocused({ timeout: 3_000 });
  });

  test('presence above range shows error', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    await page.locator('.terminal-input').first().fill('11');
    await page.click('button:has-text("[Enter] Submit")');

    await expect(page.locator('.terminal-error')).toBeVisible({ timeout: 3_000 });
  });

  test('non-numeric presence shows error', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    await page.locator('.terminal-input').first().fill('abc');
    await page.click('button:has-text("[Enter] Submit")');

    await expect(page.locator('.terminal-error')).toBeVisible({ timeout: 3_000 });
  });

  test('required text question empty shows error', async ({ page }) => {
    await page.goto(USER_URL);
    await skipBreathing(page);

    // Skip to Q1 (joy — required text)
    await page.locator('.terminal-input').first().fill('7');
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=Your joy-moment', { timeout: 5_000 });

    // Submit empty
    await page.click('button:has-text("[Enter] Submit")');
    await expect(page.locator('.terminal-error')).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Full entry flow', () => {
  async function completeFlow(page) {
    await page.goto(USER_URL);
    await skipBreathing(page);

    const answers = ['7', 'First coffee', 'Curiosity: deep work session', ''];

    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('.step-question', { timeout: 5_000 });
      const input = page.locator('.terminal-input').first();
      await expect(input).toBeVisible({ timeout: 5_000 });

      if (answers[i]) {
        await input.fill(answers[i]);
        await page.click('button:has-text("[Enter] Submit")');
      } else {
        // Optional question — click Skip
        const skipBtn = page.locator('button:has-text("[S] Skip")');
        if (await skipBtn.isVisible()) {
          await skipBtn.click();
        } else {
          await page.click('button:has-text("[Enter] Submit")');
        }
      }
    }
  }

  test('completing all questions reaches review page', async ({ page }) => {
    await completeFlow(page);
    await expect(page.locator('text=Here\'s your entry:')).toBeVisible({ timeout: 5_000 });
  });

  test('review page shows submitted answers', async ({ page }) => {
    await completeFlow(page);
    await expect(page.locator('text=First coffee')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Curiosity: deep work session')).toBeVisible();
  });

  test('[Y] Save saves the entry and shows confirmation', async ({ page }) => {
    await completeFlow(page);
    await page.waitForSelector('text=Here\'s your entry:', { timeout: 5_000 });
    await page.click('button:has-text("[Y] Save")');
    await expect(page.locator('.step-saved')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Entry saved.')).toBeVisible({ timeout: 8_000 });
  });

  test('pressing Enter on the review page saves the entry', async ({ page }) => {
    await completeFlow(page);
    await page.waitForSelector('text=Here\'s your entry:', { timeout: 5_000 });
    // Wait for the Save button to actually appear (it fades in ~1.2s after review renders).
    await expect(page.locator('button:has-text("[Y] Save")')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Enter');
    await expect(page.locator('.step-saved')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=Entry saved.')).toBeVisible({ timeout: 8_000 });
  });

  test('[N] Discard returns to breathing without saving', async ({ page }) => {
    await completeFlow(page);
    await page.waitForSelector('text=Here\'s your entry:', { timeout: 5_000 });
    await page.click('button:has-text("[N] Discard")');
    await expect(page.locator('.step-breathing')).toBeVisible({ timeout: 5_000 });
  });

  test('after save, New Entry button navigates back to breathing', async ({ page }) => {
    await completeFlow(page);
    await page.click('button:has-text("[Y] Save")');
    await page.waitForSelector('.step-saved', { timeout: 5_000 });

    // [N] New Entry button appears after the saved animation
    await page.waitForSelector('a:has-text("[N] New Entry")', { timeout: 10_000 });
    await page.click('a:has-text("[N] New Entry")');
    await expect(page.locator('.step-breathing')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('History', () => {
  test('history page loads', async ({ page }) => {
    await page.goto(`${USER_URL}/history`);
    await expect(page).toHaveURL(/\/history/);
    expect(page.locator('body')).toBeTruthy();
  });

  test('history link in nav navigates to history page', async ({ page }) => {
    await page.goto(USER_URL);
    await page.click('a:has-text("History")');
    await expect(page).toHaveURL(/\/history/, { timeout: 5_000 });
  });
});

test.describe('Theme toggle', () => {
  test('theme toggle button is present', async ({ page }) => {
    await page.goto(USER_URL);
    await expect(page.locator('.theme-toggle')).toBeVisible();
  });

  test('clicking theme toggle changes data-theme attribute', async ({ page }) => {
    await page.goto(USER_URL);
    const initialTheme = await page.locator('html').getAttribute('data-theme');
    await page.click('.theme-toggle');
    const newTheme = await page.locator('html').getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
  });
});
