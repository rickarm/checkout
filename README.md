# Checkout Journal 🌙

[![npm version](https://img.shields.io/npm/v/@rickarm/checkout.svg)](https://www.npmjs.com/package/@rickarm/checkout)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@rickarm/checkout)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-26%20passing-brightgreen.svg)](https://github.com/rickarm/checkout)

A lightweight CLI journaling app for 5-minute evening reflection. End your day with presence, gratitude, and intention.

## What is Checkout?

Checkout is a simple, focused journaling tool that guides you through five evening reflection questions:

1. **Presence** - Rate how present you feel (1-10)
2. **Joy** - Recall one specific moment of joy from today
3. **Values** - Think of an action that aligned with your values
4. **Pride** - Something you're proud of
5. **Letting Go** - What you choose to release

Each session begins with a brief breathing exercise to help you transition into reflection mode.

## Features

- ✨ **Guided prompts** - Five thoughtful questions for evening reflection
- 🫁 **Breathing exercise** - 8-second pause to center yourself
- 📁 **Organized storage** - Entries saved as markdown in `~/journals/YYYY/MM/`
- 📋 **List view** - Browse all entries grouped by month
- 🔗 **Browsable index** - Auto-generated `index.md` with wiki-style links
- 📥 **Import** - Bring in existing markdown journal entries
- ✅ **Validation** - Check entry integrity and format
- ⚙️ **Configurable** - Customize journal directory location
- 🧪 **Well-tested** - 26 passing tests, 6 test suites

## Installation

### Requirements
- Node.js v14 or higher
- npm v6 or higher

### Install from npm (Recommended)

```bash
npm install -g @rickarm/checkout
```

That's it! The `checkout` command is now available globally.

### Install from Source

Alternatively, install from source:

```bash
# Clone the repository
git clone https://github.com/rickarm/checkout.git
cd checkout

# Install dependencies
npm install

# Link globally
npm link
```

### Verify Installation

```bash
checkout --help
```

You should see the help menu with available commands.

## Quick Start

### First Run

On first run, Checkout will ask where to store your journal entries (default: `~/journals`):

```bash
checkout

# Output:
# 👋 Welcome to Checkout
# No config found. Let me set you up.
# ? Where should I store journal entries? (~/journals)
```

### Create Your First Entry

```bash
checkout
```

Follow the prompts:
1. **Breathing exercise** - Take a moment to breathe (8 seconds)
2. **Answer questions** - Five reflection prompts
3. **Review** - See your complete entry
4. **Save** - Confirm to save to your journal

### View Your Entries

```bash
checkout list
```

Output:
```
Journal (4 entries)

2026 — February

  15  2026-02-15-checkout-v1.md
  14  2026-02-14-checkout-v1.md
  13  2026-02-13-checkout-v1.md
  12  2026-02-12-checkout-v1.md
```

## Commands

### `checkout`
Start a new journal entry (default command).

```bash
checkout
```

### `checkout test`
Practice run - create an entry without saving to file. Perfect for:
- First-time users learning the flow
- Trying out the journaling process
- Testing after installation

```bash
checkout test
```

**Note:** Entry is validated but not saved. Use `checkout` (without `test`) to save entries.

### `checkout list`
View all journal entries, grouped by month. Automatically generates `index.md` with wiki-style links.

```bash
checkout list
# Alias: checkout ls
```

**Generated index.md:**
- Created at `~/journals/index.md`
- Contains wiki-style links: `[[./2026/02/2026-02-12-checkout-v1.md]]`
- Organized by year and month (most recent first)
- Includes entry count and generation timestamp
- Perfect for browsing in Obsidian, Notion, or any markdown viewer

### `checkout import <path>`
Import markdown file(s) into your journal.

```bash
# Import single file
checkout import ~/Downloads/2026-02-10-checkout-v1.md

# Import directory of files
checkout import ~/old-journals/
```

**Requirements:**
- Files must follow naming: `YYYY-MM-DD-checkout-v1.md`
- Must include metadata section with `---` separator

### `checkout validate`
Check integrity of all journal entries.

```bash
checkout validate
```

Validates:
- Filename format (`YYYY-MM-DD-template.md`)
- Metadata presence and structure
- Required sections for template
- File location matches date

### `checkout config`
Show current configuration.

```bash
checkout config
```

## File Format

Entries are stored as markdown files with this structure:

```markdown
## How present do you feel right now?
7

## Your joy-moment
Morning coffee with my partner

## Think of your values
Kindness: helped a colleague with debugging

## Something I'm proud of
Shipped a major feature today

## What do you decide to let go of?
Worry about deadlines

---

**Metadata**
- Created: 2026-02-12T22:56:04.347Z
- Template: checkout-v1
- Version: 1.0
```

### File Naming Convention

Format: `YYYY-MM-DD-{templateId}.md`

Example: `2026-02-12-checkout-v1.md`

### Directory Structure

```
~/journals/
├── index.md                          # Auto-generated browsable index
├── 2026/
│   ├── 01/
│   │   ├── 2026-01-15-checkout-v1.md
│   │   └── 2026-01-31-checkout-v1.md
│   └── 02/
│       ├── 2026-02-01-checkout-v1.md
│       └── 2026-02-12-checkout-v1.md
└── 2025/
    └── 12/
        └── 2025-12-31-checkout-v1.md
```

### Index File (index.md)

The `index.md` file is auto-generated by `checkout list`:

```markdown
# Journal Index

*5 entries*

---

## 2026

### February

- **12** — [[./2026/02/2026-02-12-checkout-v1.md]]
- **10** — [[./2026/02/2026-02-10-checkout-v1.md]]

### January

- **15** — [[./2026/01/2026-01-15-checkout-v1.md]]

## 2025

### December

- **31** — [[./2025/12/2025-12-31-checkout-v1.md]]

---

*Generated: 2026-02-12T23:45:56.673Z*
```

**Features:**
- Wiki-style links work in Obsidian, Foam, Logseq, and many markdown tools
- Click links to navigate directly to entries
- Organized by year → month → day (descending)
- Entry count and timestamp
- Regenerated automatically on every `checkout list`

## Configuration

Config file location: `~/.checkout/config.json`

```json
{
  "journalDir": "/Users/you/journals",
  "githubRepo": null,
  "githubUsername": null,
  "autoSync": false,
  "localGit": true,
  "templates": {
    "active": "checkout-v1"
  },
  "createdAt": "2026-02-12T22:03:59.919Z"
}
```

### Change Journal Directory

Edit `~/.checkout/config.json` and update `journalDir`:

```json
{
  "journalDir": "/path/to/your/journals",
  ...
}
```

Or delete the config file and run `checkout` again to reconfigure.

## Sharing Journals Across Projects

To access your journal entries from another project (e.g., for analysis or visualization):

### Create a Symlink

```bash
cd /path/to/your/other-project
ln -s ~/journals ./journals
```

Now your other project can read entries via `./journals/`.

**Benefits:**
- Single source of truth (no sync issues)
- Both projects access the same files
- Works with any programming language/tool
- Transparent to applications (Node.js, Python, etc.)

## Development

### Run Tests

```bash
npm test
```

Test suites:
- Entry validation and markdown generation
- Config management and path expansion
- Storage operations and file handling
- Import functionality (single/batch)
- Validation checks and reporting

### Project Structure

```
checkout/
├── bin/
│   └── checkout.js          # CLI entry point
├── lib/
│   ├── cli/
│   │   ├── commands.js      # Command handlers
│   │   ├── display.js       # Output formatting
│   │   └── prompts.js       # Interactive prompts
│   ├── core/
│   │   ├── config.js        # Configuration management
│   │   ├── entry.js         # Entry model
│   │   └── storage.js       # File operations
│   ├── features/
│   │   ├── importer.js      # Import functionality
│   │   └── validator.js     # Validation logic
│   └── templates/
│       └── checkout-v1.json # Question template
├── tests/                   # Test files
├── docs/                    # Documentation
└── package.json
```

## Troubleshooting

### Command not found: `checkout`

Run `npm link` again from the checkout directory.

### Config errors

Delete `~/.checkout/config.json` and run `checkout` to reconfigure.

### Import fails

Ensure files follow naming convention: `YYYY-MM-DD-checkout-v1.md`

Check that files have metadata section with `---` separator.

### Cursor misalignment when typing long answers

This was fixed in v1.0.1. Update to latest version or ensure you have the fix commit.

## Philosophy

Checkout is built on the principle that **consistency > perfection**. A simple 5-minute daily practice creates more value than elaborate journaling done sporadically.

The questions are designed to:
- **Ground you in the present** moment
- **Cultivate gratitude** for small joys
- **Reinforce values** through reflection
- **Build self-appreciation** via pride
- **Release what doesn't serve** you

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- 🐛 [Report bugs](https://github.com/rickarm/checkout/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/rickarm/checkout/issues/new?template=feature_request.md)
- 🔀 [Submit pull requests](https://github.com/rickarm/checkout/pulls)

## Support

- 📖 [Documentation](docs/)
- 💬 [Discussions](https://github.com/rickarm/checkout/discussions)
- 🐛 [Issue Tracker](https://github.com/rickarm/checkout/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**Rick Armbrust**

- GitHub: [@rickarm](https://github.com/rickarm)

Built with [Claude Code](https://claude.ai/claude-code) 🤖

## Acknowledgments

- Inspired by the need for simple, consistent reflection practices
- Built for those who value presence over productivity
- Community feedback and contributions

---

_"The days are long, but the years are short. Checkout helps you savor both."_

**Star this repo if Checkout helps you reflect! ⭐**
