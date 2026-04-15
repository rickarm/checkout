/* ─── Alpine.js Components ──────────────────────────────────── */

document.addEventListener('alpine:init', () => {

  // ── Typewriter Effect ──────────────────────────────────────
  Alpine.data('typewriter', (text, speed = 50) => ({
    displayed: '',
    done: false,
    start() {
      let i = 0;
      const interval = setInterval(() => {
        this.displayed = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(interval);
          this.done = true;
        }
      }, speed);
    }
  }));

  // ── Breathing Exercise ─────────────────────────────────────
  Alpine.data('breathingExercise', () => ({
    phase: 'intro',
    timer: 8,
    breathIn: true,

    start() {
      setTimeout(() => {
        this.phase = 'breathe';
        this.runBreathing();
      }, 1200);
    },

    runBreathing() {
      this.timer = 8;
      this.breathIn = true;

      const countdown = setInterval(() => {
        this.timer--;
        if (this.timer === 4) this.breathIn = false;
        if (this.timer <= 0) {
          clearInterval(countdown);
          this.phase = 'ready';
        }
      }, 1000);
    }
  }));

  // ── Question Step ──────────────────────────────────────────
  Alpine.data('questionStep', () => ({
    promptVisible: false,
    inputVisible: false,

    start() {
      setTimeout(() => { this.promptVisible = true; }, 1200);
      setTimeout(() => {
        this.inputVisible = true;
        this.$nextTick(() => {
          // Wait for the next frame to ensure the element is painted
          // before focusing — iOS Safari won't connect the keyboard to
          // an element that was display:none on the same frame.
          requestAnimationFrame(() => {
            this.focusInput();
          });
        });
      }, 1600);
    },

    focusInput() {
      const input = this.$refs.answerInput;
      if (input) {
        input.focus();
        this.updateCursor();
      }
    },

    updateCursor() {
      const input = this.$refs.answerInput;
      const cursor = this.$refs.inputCursor;
      const mirror = this.$refs.inputMirror;
      if (!input || !cursor || !mirror) return;

      mirror.textContent = input.value;
      const promptWidth = input.offsetLeft;
      cursor.style.left = (promptWidth + mirror.offsetWidth) + 'px';
    }
  }));

  // ── Review Step ────────────────────────────────────────────
  Alpine.data('reviewStep', () => ({
    contentVisible: false,
    actionsVisible: false,

    start() {
      setTimeout(() => { this.contentVisible = true; }, 800);
      setTimeout(() => { this.actionsVisible = true; }, 1200);
    }
  }));

  // ── Saved Step ─────────────────────────────────────────────
  Alpine.data('savedStep', () => ({
    phase: 0,

    start() {
      setTimeout(() => { this.phase = 1; }, 200);
      setTimeout(() => { this.phase = 2; }, 1000);
      setTimeout(() => { this.phase = 3; }, 1600);
      setTimeout(() => { this.phase = 4; }, 2400);
    }
  }));

  // ── Entry View (with swipe navigation) ────────────────────
  // prevUrl = older entry, nextUrl = newer entry
  Alpine.data('entryView', (prevUrl, nextUrl) => ({
    visible: false,
    _touchStartX: 0,
    _touchStartY: 0,

    start() {
      setTimeout(() => { this.visible = true; }, 200);
    },

    handleTouchStart(e) {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
    },

    handleTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;

      // Only count as a horizontal swipe if wider than it is tall
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

      if (dx < 0 && nextUrl) {
        // Swipe left → newer entry
        htmx.ajax('GET', nextUrl, { target: '#screen-content', swap: 'innerHTML' });
      } else if (dx > 0 && prevUrl) {
        // Swipe right → older entry
        htmx.ajax('GET', prevUrl, { target: '#screen-content', swap: 'innerHTML' });
      }
    }
  }));

});

/* ─── Theme Toggle ──────────────────────────────────────────── */
// Cycles through available themes and persists to localStorage.
const THEMES = ['doogie', 'leela'];

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'doogie';
  const nextIdx = (THEMES.indexOf(current) + 1) % THEMES.length;
  const next = THEMES[nextIdx];
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('checkout-theme', next);
}

/* ─── Keyboard Shortcuts ───────────────────────────────────── */
// Maps key presses to visible buttons/links labelled [X] (e.g. [Y] Begin).
// Ignores keys when an input or textarea has focus so typing isn't hijacked.
document.addEventListener('keydown', (e) => {
  // Don't intercept when typing in an input
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const key = e.key.toUpperCase();

  // Find a visible button or link whose text starts with [<key>]
  const selector = '.terminal-btn, a.terminal-btn';
  for (const el of document.querySelectorAll(selector)) {
    // Skip hidden elements (inside x-show=false parents)
    if (el.offsetParent === null) continue;

    const label = el.textContent.trim();
    if (label.startsWith(`[${key}]`)) {
      e.preventDefault();
      el.click();
      return;
    }
  }
});

/* ─── Re-initialize Alpine on htmx swaps ──────────────────── */
document.addEventListener('htmx:afterSwap', () => {
  if (window.Alpine) {
    document.querySelectorAll('[x-data]').forEach(el => {
      if (!el._x_dataStack) Alpine.initTree(el);
    });
  }
});

/* ─── Focus management after htmx swaps ───────────────────── */
document.addEventListener('htmx:afterSettle', () => {
  const input = document.querySelector('.terminal-input');
  // Only focus if the input is visible (not hidden by x-show/x-cloak).
  // On iOS Safari, focusing a hidden input won't connect the keyboard.
  if (input && input.offsetParent !== null) {
    setTimeout(() => input.focus(), 100);
  }
});
