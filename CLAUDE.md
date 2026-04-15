# Checkout: Evening Reflection Journal

Node.js CLI tool for 5-minute guided evening reflections. Stores entries as dated markdown files.

## Development Workflow

See `KB-Development-Workflow.md` in the Knowledge Base for the full workflow. Summary:

1. Bugs and features are tracked as **GitHub Issues**
2. Claude works on a **feature branch** (worktrees for isolation in local sessions)
3. Claude pushes the branch and opens a **Pull Request**
4. Rick reviews and merges the PR
5. Adding the `claude` label to an issue triggers Claude via GitHub Actions

## Commands

```bash
npm test              # Jest unit + integration tests (55 tests, 7 suites)
npm run test:e2e      # Playwright E2E tests (22 tests) — requires: npx playwright install chromium
npm run test:e2e:ui   # Playwright interactive UI mode
npm run dev           # Run CLI locally
npm link              # Install globally as `checkout` command

checkout              # Create new journal entry (interactive)
checkout list         # View all entries (generates index.md)
checkout test         # Test run without saving
checkout import       # Import existing markdown files
checkout validate     # Verify all entries
checkout config       # Show current configuration
checkout serve        # Start web interface (default port 3000)
checkout serve -p N   # Custom port
```

## Architecture

```
bin/checkout.js          # CLI entry point (commander)
lib/
  cli/commands.js        # Command handlers
  core/
    config.js            # Config management (~/.checkout/config.json)
    entry.js             # Entry creation and formatting
    storage.js           # File I/O, path resolution
  web/
    server.js            # Express web server
    views/               # EJS templates
    public/              # Static assets (CSS, JS)
  templates/
    checkout-v1.json     # Question template
```

## Web Interface

```bash
checkout serve           # Start web UI (default port 3000)
checkout web             # Alias for serve
checkout serve -p 4000   # Custom port
```

Browser-based version of the same guided reflection flow. Uses HTMX for step-by-step navigation. Sessions expire after 30 minutes.

## Storage

- Entries: `~/kb/journal/YYYY-MM-DD-checkout-v1.md`
- Config: `~/.checkout/config.json`
- Index: `~/kb/journal/index.md` (auto-generated with wiki-style links)

## Testing

```
tests/
  *.test.js          # Jest: unit + integration (run with: npm test)
  e2e/
    checkout.spec.js       # Playwright: E2E browser tests (run with: npm run test:e2e)
    start-test-server.js   # Spins up Express on port 4321 with a temp journalDir
playwright.config.js       # Playwright config — webServer auto-starts the test server
```

Jest ignores `tests/e2e/` via `testPathIgnorePatterns` in `package.json`. Playwright must be invoked separately.

First-time Playwright setup per machine: `npm install && npx playwright install chromium`

## Gotchas

- File naming is strict: must match `YYYY-MM-DD-checkout-v1.md`
- Config lives outside repo at `~/.checkout/`
- No launchd integration — this is a manual CLI tool
- EJS 5 uses strict mode: all variables referenced in templates must be passed explicitly in `res.render()` or set in `res.locals`. Missing variables throw `ReferenceError` (not undefined).
- Playwright browser binaries live in `~/Library/Caches/ms-playwright/` — not committed, must be installed per machine.
