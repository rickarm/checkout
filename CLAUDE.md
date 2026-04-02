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
npm test          # Run jest tests (26 tests, 6 suites)
npm run dev       # Run CLI locally
npm link          # Install globally as `checkout` command

checkout          # Create new journal entry (interactive)
checkout list     # View all entries (generates index.md)
checkout test     # Test run without saving
checkout import   # Import existing markdown files
checkout validate # Verify all entries
checkout config   # Show current configuration
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
  templates/
    checkout-v1.json     # Question template
```

## Storage

- Entries: `~/journals/YYYY/MM/YYYY-MM-DD-checkout-v1.md`
- Config: `~/.checkout/config.json`
- Index: `~/journals/index.md` (auto-generated with wiki-style links)

## Gotchas

- File naming is strict: must match `YYYY-MM-DD-checkout-v1.md`
- Config lives outside repo at `~/.checkout/`
- No launchd integration — this is a manual CLI tool
