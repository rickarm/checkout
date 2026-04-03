/* ─── Alpine.js Components for Doogie Howser Terminal ──────── */

document.addEventListener('alpine:init', () => {

  // ── Typewriter Effect ──────────────────────────────────────
  // Usage: x-data="typewriter('Hello world', 50)" x-init="start()"
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
    phase: 'intro',    // intro → breathe → ready
    timer: 8,
    breathIn: true,

    start() {
      // Show intro typewriter, then transition to breathing
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

        // Toggle breath direction at halfway
        if (this.timer === 4) {
          this.breathIn = false;
        }

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
      // Show prompt after title typewriter finishes
      setTimeout(() => {
        this.promptVisible = true;
      }, 1200);

      // Show input after prompt appears
      setTimeout(() => {
        this.inputVisible = true;
        this.$nextTick(() => {
          const input = this.$refs.answerInput;
          if (input) {
            input.focus();
            this.updateCursor();
          }
        });
      }, 1600);
    },

    updateCursor() {
      const input = this.$refs.answerInput;
      const cursor = this.$refs.inputCursor;
      const mirror = this.$refs.inputMirror;
      if (!input || !cursor || !mirror) return;

      // Mirror the input text to measure its rendered width
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
      setTimeout(() => {
        this.contentVisible = true;
      }, 800);

      setTimeout(() => {
        this.actionsVisible = true;
      }, 1200);
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

  // ── Entry View ─────────────────────────────────────────────
  Alpine.data('entryView', () => ({
    visible: false,

    start() {
      setTimeout(() => {
        this.visible = true;
      }, 200);
    }
  }));

});

/* ─── Re-initialize Alpine on htmx swaps ──────────────────── */
document.addEventListener('htmx:afterSwap', () => {
  // Alpine automatically initializes new elements in the DOM
  // But we need to make sure new elements with x-data are picked up
  if (window.Alpine) {
    // Force Alpine to scan for new components
    document.querySelectorAll('[x-data]').forEach(el => {
      if (!el._x_dataStack) {
        Alpine.initTree(el);
      }
    });
  }
});

/* ─── Focus management after htmx swaps ───────────────────── */
document.addEventListener('htmx:afterSettle', () => {
  // Auto-focus the terminal input if present
  const input = document.querySelector('.terminal-input');
  if (input) {
    setTimeout(() => input.focus(), 100);
  }
});
