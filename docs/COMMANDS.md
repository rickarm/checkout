# Command Reference

Complete reference for all Checkout Journal commands.

## Table of Contents

- [checkout (default)](#checkout-default)
- [checkout test](#checkout-test)
- [checkout list](#checkout-list)
- [checkout import](#checkout-import)
- [checkout validate](#checkout-validate)
- [checkout config](#checkout-config)

---

## checkout (default)

Start a new journal entry with guided prompts.

### Usage

```bash
checkout
```

### Flow

1. **Breathing Exercise** (8 seconds)
   - "Take a moment to breathe"
   - Countdown timer: 8s → 1s
   - Confirmation prompt: "Ready?"

2. **Five Questions** (in order)
   - Presence rating (1-10, required)
   - Joy moment (text, required)
   - Values reflection (text, required)
   - Pride (text, optional)
   - Letting go (text, optional)

3. **Review**
   - See complete entry formatted as markdown
   - Shows file path where it will be saved

4. **Confirmation**
   - "Save to /path/to/file?"
   - Yes (default) - Save and exit
   - No - Discard and exit

### Examples

**Session output:**
```
🌙 Evening Checkout

Take a moment to breathe.
4 seconds in... 4 seconds out.

8s 7s 6s 5s 4s 3s 2s 1s 0s ✓
? Ready? (Y/n)

How present do you feel right now?
Rate your sense of presence on a scale of 1-10.

Your answer: 8

Your joy-moment
Give one specific moment of joy from today.
💡 e.g. first sip of coffee, funny text, smell from walk

Your answer: Morning coffee with my partner

[... continues through all questions ...]

==================================================
Here's your entry:

## How present do you feel right now?
8

## Your joy-moment
Morning coffee with my partner

[... rest of entry ...]

==================================================

? Save to /Users/you/journals/2026/02/2026-02-12-checkout-v1.md? (Y/n)

✓ Entry saved
✓ Path: /Users/you/journals/2026/02/2026-02-12-checkout-v1.md

Done! 🌙
```

### Validation

- **Presence** must be 1-10 (validates before proceeding)
- **Required questions** cannot be empty
- **Optional questions** can be left blank (press Enter)

### File Created

Format: `YYYY-MM-DD-checkout-v1.md`

Location: `{journalDir}/YYYY/MM/YYYY-MM-DD-checkout-v1.md`

Example: `~/journals/2026/02/2026-02-12-checkout-v1.md`

### Tips

- **Skip breathing:** Answer "n" to "Ready?" to cancel
- **Long answers:** Type naturally; word wrap is handled
- **Fix mistakes:** Currently must complete entry and edit file manually
- **Multiple entries per day:** Filename includes date only, so one entry per day per template
- **Try it first:** Use `checkout test` for a practice run without saving

---

## checkout test

Practice run - create an entry without saving to file.

### Usage

```bash
checkout test
```

### Purpose

Perfect for:
- **First-time users** - Learn the flow before saving real entries
- **Testing installation** - Verify checkout works correctly
- **Trying the process** - Experience the journaling flow without commitment
- **Exploring questions** - See all five reflection prompts
- **Training others** - Demonstrate the app without creating files

### Flow

Identical to `checkout` (default command):

1. **Breathing Exercise** (8 seconds)
2. **Five Questions** (in order)
3. **Entry Preview** (formatted markdown)
4. **Exit** - Entry is NOT saved

### Output

**Session example:**
```
🧪 Test Mode

Practice run - entry will not be saved

🌙 Evening Checkout

Take a moment to breathe.
4 seconds in... 4 seconds out.

[... continues through all questions ...]

==================================================
Here's your test entry:

## How present do you feel right now?
8

## Your joy-moment
Testing the checkout app

[... rest of entry ...]

==================================================

ℹ Test complete - entry was not saved
Run "checkout" without "test" to save entries
```

### What Happens

- ✅ Breathing exercise runs
- ✅ All questions prompt
- ✅ Input is validated
- ✅ Entry is previewed
- ❌ **File is NOT created**
- ❌ No save confirmation prompt

### Validation

Entry is still validated:
- Presence rating must be 1-10
- Required questions must be answered
- Shows validation errors if any

But unlike normal checkout, validation errors don't prevent completion - they're just shown as feedback.

### Use Cases

**Teaching/Demo:**
```bash
# Show someone the process
checkout test
```

**Quick test after install:**
```bash
npm install
npm link
checkout test  # Verify it works
```

**Exploring the app:**
```bash
# See what questions are asked
checkout test
```

**Development/Testing:**
```bash
# Test changes without polluting journal
checkout test
```

### Comparison

| Aspect | `checkout` | `checkout test` |
|--------|-----------|-----------------|
| Breathing exercise | ✅ Yes | ✅ Yes |
| Five questions | ✅ Yes | ✅ Yes |
| Validation | ✅ Yes | ✅ Yes |
| Entry preview | ✅ Yes | ✅ Yes |
| Save confirmation | ✅ Yes | ❌ No |
| **Creates file** | ✅ **Yes** | ❌ **No** |
| **Updates index** | ✅ Yes | ❌ No |

### Notes

- Test mode is clearly indicated at the start
- Entry is fully validated (same rules as normal)
- Perfect for onboarding new users
- No config needed - works immediately after install
- Can be run multiple times without side effects

---

## checkout list

View all journal entries, organized by month. Automatically generates a browsable `index.md` file.

### Usage

```bash
checkout list

# Or use alias
checkout ls
```

### Output

```
Journal (15 entries)

2026 — February

  15  2026-02-15-checkout-v1.md
  14  2026-02-14-checkout-v1.md
  13  2026-02-13-checkout-v1.md
  ...

2026 — January

  31  2026-01-31-checkout-v1.md
  30  2026-01-30-checkout-v1.md
  ...

Generating index.md...
✓ Index updated: /Users/you/journals/index.md

2025 — December

  31  2025-12-31-checkout-v1.md
```

### Behavior

- **Sorted:** Most recent first (descending by modification time)
- **Grouped:** By year and month
- **All templates:** Shows all `.md` files in journal directory
- **Empty:** Shows "No entries found" if journal is empty
- **Index generation:** Automatically creates/updates `index.md` after listing

### Generated Index File

**Location:** `{journalDir}/index.md`

**Format:**
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

---

*Generated: 2026-02-12T23:45:56.673Z*
```

**Features:**
- **Wiki-style links:** Compatible with Obsidian, Foam, Logseq, Notion
- **Clickable navigation:** Open entries directly from index
- **Organized structure:** Year → Month → Day (descending)
- **Entry count:** Shows total number of entries
- **Timestamp:** Shows when index was generated
- **Auto-updated:** Regenerated every time you run `checkout list`

**Use with tools:**
- **Obsidian:** Open `~/journals` as vault, index links work natively
- **VS Code + Foam:** Open journal folder, cmd+click to follow links
- **GitHub/GitLab:** Push journals to repo, index becomes browsable table of contents
- **Any markdown viewer:** Links are standard relative paths

### Use Cases

- Quick overview of journaling consistency
- Check if you've journaled today
- Browse entries by date
- Verify imports completed successfully
- Share journal index with others (links work in any markdown tool)
- Create a browsable backup

---

## checkout import

Import markdown file(s) into your journal.

### Usage

```bash
# Import single file
checkout import <file-path>

# Import directory of files
checkout import <directory-path>
```

### Single File Import

**Example:**
```bash
checkout import ~/Downloads/2026-02-10-checkout-v1.md
```

**Output:**
```
📥 Import Journal Entries

Importing file: /Users/you/Downloads/2026-02-10-checkout-v1.md

✓ File imported successfully
✓ Location: /Users/you/journals/2026/02/2026-02-10-checkout-v1.md
```

**Requirements:**
- Filename must match: `YYYY-MM-DD-{template}.md`
- Must contain metadata section with `---` separator
- Must contain `**Metadata**` header
- File must be readable

**Error handling:**
- Invalid filename → Error with format requirements
- Missing metadata → Error with warning
- Duplicate entry → Error (won't overwrite)
- Invalid date → Error parsing filename

### Directory Import

**Example:**
```bash
checkout import ~/old-journals/
```

**Output:**
```
📥 Import Journal Entries

Importing from directory: /Users/you/old-journals/

Import Summary:

  Total files:    10
  ✓ Imported:     8
  ⊘ Skipped:      1
  ✗ Failed:       1

Failed imports:
  - invalid-name.md: Filename must match YYYY-MM-DD-{templateId}.md

✓ Import completed
```

**Behavior:**
- Scans directory for `.md` files (non-recursive)
- Validates each file
- Shows summary with counts
- Lists failed imports with reasons
- Skips files that already exist (no overwrite)

### Validation Checks

1. **Filename format**
   - Pattern: `^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$`
   - Example: `2026-02-12-checkout-v1.md` ✓
   - Example: `my-journal.md` ✗

2. **Metadata section**
   - Must contain `---` separator
   - Must contain `**Metadata**` text
   - Content validation is lenient

3. **Duplicate check**
   - Compares target path
   - Won't overwrite existing entries
   - Reports as "skipped"

### Use Cases

- **Migrate from another system:** Import old markdown journals
- **Restore from backup:** Re-import after data loss
- **Consolidate journals:** Merge multiple journal sources
- **Share entries:** Import entries from another user

### Tips

- **Batch rename files** to match format before importing
- **Backup first** before large imports
- **Validate after import:** Run `checkout validate`
- **Check list:** Use `checkout list` to verify

---

## checkout validate

Validate all journal entries for integrity and format compliance.

### Usage

```bash
checkout validate
```

### Output (All Valid)

```
🔍 Validate Journal Entries

Checking: /Users/you/journals

Validation Summary:

  Total entries:       15
  ✓ Valid:             15
  ✗ Invalid:           0
  ⚠ With warnings:     0

✓ All entries are valid! ✨
```

### Output (With Issues)

```
🔍 Validate Journal Entries

Checking: /Users/you/journals

Validation Summary:

  Total entries:       15
  ✓ Valid:             13
  ✗ Invalid:           1
  ⚠ With warnings:     1

Issues Found:

  2026-02-10-checkout-v1.md:
    ⚠ Missing "Created" metadata field

  invalid-name.md:
    ✗ Invalid filename format: Filename must match YYYY-MM-DD-{templateId}.md
    ✗ No question sections found (missing ##)

⚠ Found 1 invalid entries
```

### Validation Checks

#### Filename Format
- Pattern: `YYYY-MM-DD-{templateId}.md`
- Must be all lowercase (except date)
- Date must be valid format

#### File Structure
- **Metadata separator:** Must contain `---`
- **Metadata header:** Should contain `**Metadata**`
- **Sections:** Must contain `##` (question headers)

#### Metadata Fields (warnings)
- `- Created:` timestamp
- `- Template:` template ID
- `- Version:` version number

#### Template-Specific (checkout-v1)

Required sections (warnings if missing):
- "How present do you feel right now?"
- "Your joy-moment"
- "Think of your values"

#### Location Check
- File should be in `YYYY/MM/` folder matching its date
- Example: `2026-02-12-*.md` should be in `2026/02/`

### Error vs Warning

**Errors** (entry marked invalid):
- Invalid filename format
- Missing metadata separator
- No question sections
- File unreadable

**Warnings** (entry still valid):
- Missing metadata fields
- Missing expected sections
- File location doesn't match date

### Use Cases

- **After import:** Verify all files imported correctly
- **After manual edits:** Check you didn't break format
- **Periodic maintenance:** Ensure journal integrity
- **Before backup:** Validate before archiving
- **Troubleshooting:** Diagnose issues with entries

### Tips

- Run after bulk imports
- Fix errors before warnings
- Location warnings are informational only
- Missing optional sections are not flagged

---

## checkout config

Show current configuration.

### Usage

```bash
checkout config
```

### Output

```
Current Configuration

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

### Configuration Fields

| Field | Description | Default |
|-------|-------------|---------|
| `journalDir` | Where journal entries are stored | `~/journals` |
| `githubRepo` | GitHub repository for sync (future) | `null` |
| `githubUsername` | GitHub username (future) | `null` |
| `autoSync` | Auto-sync to remote (future) | `false` |
| `localGit` | Use local git (future) | `true` |
| `templates.active` | Active journal template | `checkout-v1` |
| `createdAt` | When config was created | ISO timestamp |

### Editing Config

**Manual edit:**
```bash
nano ~/.checkout/config.json
```

**Common changes:**

Change journal directory:
```json
{
  "journalDir": "/new/path/to/journals"
}
```

**Future option:** `--set` flag (not yet implemented)
```bash
checkout config --set journalDir ~/new-journals
```

### Config Location

File: `~/.checkout/config.json`

Created on first run, persists across sessions.

### Troubleshooting

**Config not found:**
- Run `checkout` to create new config

**Invalid config:**
- Delete `~/.checkout/config.json`
- Run `checkout` to reconfigure

---

## Global Options

### Version

```bash
checkout --version
# or
checkout -V
```

### Help

```bash
checkout --help
# or
checkout -h
```

Shows:
- Command list
- Options
- Aliases

### Command Help

```bash
checkout <command> --help
```

Example:
```bash
checkout import --help
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (validation failed, file not found, etc.) |

Use in scripts:
```bash
checkout validate
if [ $? -eq 0 ]; then
  echo "All entries valid"
else
  echo "Validation failed"
fi
```

---

## Tips & Tricks

### Daily Journaling Habit

**Set up an alias:**
```bash
# In ~/.bashrc or ~/.zshrc
alias journal='checkout'
```

**Schedule with cron:**
```bash
# Run at 9 PM daily (just opens, won't auto-fill)
0 21 * * * /usr/local/bin/checkout
```

### Backup Your Journal

```bash
# Quick backup
tar -czf journal-backup-$(date +%Y%m%d).tar.gz ~/journals

# Sync to Dropbox
rsync -av ~/journals ~/Dropbox/journal-backup/
```

### Search Entries

```bash
# Find entries mentioning "coffee"
grep -r "coffee" ~/journals/

# Count total entries
find ~/journals -name "*.md" | wc -l
```

### Analyze Your Journal

```bash
# Most common words in joy moments
grep -h "## Your joy-moment" ~/journals/**/*.md -A 1 | \
  grep -v "^##" | tr ' ' '\n' | sort | uniq -c | sort -rn | head -20
```

---

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `checkout` | Create entry | `checkout` |
| `checkout test` | Practice (no save) | `checkout test` |
| `checkout list` | View entries | `checkout list` |
| `checkout import <path>` | Import file(s) | `checkout import ~/backup.md` |
| `checkout validate` | Check integrity | `checkout validate` |
| `checkout config` | Show config | `checkout config` |
| `checkout --help` | Show help | `checkout --help` |
| `checkout --version` | Show version | `checkout -V` |

---

For setup instructions, see [SETUP.md](SETUP.md).

For general information, see [README.md](../README.md).
