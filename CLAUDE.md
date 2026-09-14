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
npm test              # Jest unit + integration tests (tests/, excluding tests/e2e/)
npm run test:e2e      # Playwright E2E tests — requires: npx playwright install chromium
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
bin/
  checkout.js            # CLI entry point (commander)
  api-server.js          # Multi-user API server entry point
lib/
  cli/                   # Command handlers, display, prompts
  core/                  # config (~/.checkout/config.json), entry model
  domain/                # markdown rendering (markdown.js)
  features/              # importer, indexer, validator
  services/              # config-service, journal-service (business logic layer)
  storage/               # storage-adapter.js + adapters/ (local-filesystem, google-drive)
  auth/                  # Clerk auth, Google Drive OAuth, token-store (multi-user API)
  api/                   # Express REST API: server.js, routes/, middleware/, serializers.js
  web/                   # self-hosted web UI: server.js (Express), auth.js (password), EJS views/, static public/
  utils/                 # date helpers
  templates/             # question definitions (checkout-v1.json)
```

Two distinct auth layers: `web/auth.js` is simple per-user password auth for the self-hosted single-tenant web UI; `auth/` (Clerk + Google Drive OAuth + token-store) is for the multi-user `api/` server.

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
- Env vars: `~/.checkout/.env` (loaded by dotenv — passwords, API keys)
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

- Web auth: per-user passwords via `CHECKOUT_PASSWORD_<USERID>` in `~/.checkout/.env` or `password` field in config.json. Env vars take precedence.
- File naming is strict: must match `YYYY-MM-DD-checkout-v1.md`
- Config lives outside repo at `~/.checkout/`
- No launchd integration — this is a manual CLI tool
- Multi-user: config.users in `~/.checkout/config.json` defines per-user journalDirs, themes, templates
- Web UI served over Tailscale at `http://agent-mac-mini:3000` (Leela uses this from her iPad)
- EJS 5 uses strict mode: all variables referenced in templates must be passed explicitly in `res.render()` or set in `res.locals`. Missing variables throw `ReferenceError` (not undefined).
- Playwright browser binaries live in `~/Library/Caches/ms-playwright/` — not committed, must be installed per machine.
- 3 test suites have pre-existing failures: `api.test.js`, `google-drive-adapter.test.js`, `user-service-middleware.test.js` (missing `googleapis` dep + API test drift)
- Browser-level tests (jsdom): use `@jest-environment jsdom` docblock — `jest-environment-jsdom` is installed as devDep
- Service worker caches JS/CSS with cache-first strategy (`CACHE_NAME = 'checkout-journal-v1'`) — bump cache name when updating static assets
- Web UI keyboard shortcuts: global keydown handler in `terminal.js` maps keys to visible `[X]`-labelled buttons — new buttons with `[X] Label` text get shortcuts automatically
