# Setup Guide

Complete guide to installing and configuring Checkout Journal.

## Prerequisites

### Required
- **Node.js** v14 or higher ([download](https://nodejs.org/))
- **npm** v6 or higher (comes with Node.js)

### Check Your Versions

```bash
node --version  # Should be v14.0.0 or higher
npm --version   # Should be v6.0.0 or higher
```

## Installation

### Option 1: Install from npm (Recommended)

The easiest way to install:

```bash
npm install -g @rickarm/checkout
```

This installs the `checkout` command globally. Skip to [Verify Installation](#4-verify-installation).

### Option 2: Install from Source

For development or contributing:

#### 1. Get the Code

```bash
# Clone from repository
git clone https://github.com/rickarm/checkout.git
cd checkout
```

#### 2. Install Dependencies

```bash
npm install
```

This installs:
- `chalk` - Terminal colors and formatting
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `jest` - Testing framework
- `eslint` - Code linting

#### 3. Link Globally

```bash
npm link
```

This makes the `checkout` command available system-wide.

**What does this do?**
- Creates a symlink from your global node modules to this project
- Allows you to run `checkout` from any directory
- Changes to the code are immediately reflected (no reinstall needed)

### 4. Verify Installation

```bash
checkout --help
```

Expected output:
```
Usage: checkout [options] [command]

Evening reflection journal

Options:
  -V, --version     output the version number
  -h, --help        display help for command

Commands:
  list|ls           View all entries
  config [options]  Show current configuration
  import <path>     Import a markdown file or directory of files into journal
  validate          Validate all journal entries for integrity
```

## First-Time Configuration

### Run Checkout

```bash
checkout
```

On first run, you'll see:

```
👋 Welcome to Checkout

No config found. Let me set you up.

? Where should I store journal entries? (~/journals)
```

### Choose Journal Directory

**Options:**

1. **Default (`~/journals`)** - Press Enter
   - Creates `journals` folder in your home directory
   - Simple and recommended for most users

2. **Custom path** - Type a different path
   - Absolute: `/Users/you/Documents/my-journal`
   - Tilde: `~/Dropbox/journals`
   - Relative paths get resolved to absolute

**Example:**
```
? Where should I store journal entries? ~/Documents/checkout-journal
```

### What Gets Created

After configuration:

1. **Config file:** `~/.checkout/config.json`
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

2. **Journal directory:** Will be created on first entry save
   ```
   ~/journals/          (or your custom path)
   ```

## Reconfiguration

### Change Journal Directory

**Option 1: Edit config directly**

```bash
nano ~/.checkout/config.json
```

Change `journalDir` value:
```json
{
  "journalDir": "/new/path/to/journals",
  ...
}
```

**Option 2: Delete and reconfigure**

```bash
rm ~/.checkout/config.json
checkout
```

This will prompt you to configure again.

### Reset Everything

```bash
# Remove config
rm ~/.checkout/config.json

# Optionally remove journal entries
rm -rf ~/journals  # Be careful!

# Run checkout to reconfigure
checkout
```

## Uninstallation

### 1. Unlink Command

```bash
cd checkout
npm unlink
```

### 2. Remove Config

```bash
rm ~/.checkout/config.json
```

### 3. Remove Journal Entries (Optional)

```bash
rm -rf ~/journals  # Or your custom journal directory
```

### 4. Remove Source Code (Optional)

```bash
cd ..
rm -rf checkout
```

## Upgrading

### Pull Latest Changes

```bash
cd checkout
git pull origin main
npm install
```

The npm link is persistent, so you don't need to re-link.

### Breaking Changes

If there are breaking changes in a new version:

1. Backup your journal directory
2. Remove old config: `rm ~/.checkout/config.json`
3. Run `checkout` to reconfigure

## Troubleshooting

### `checkout: command not found`

**Cause:** npm link didn't work or PATH issue

**Solution:**
```bash
cd checkout
npm unlink
npm link
```

Verify with:
```bash
which checkout
# Should show: /usr/local/bin/checkout or similar
```

### Permission errors during `npm link`

**Cause:** Need elevated permissions for global install

**Solution:**
```bash
sudo npm link
```

Or fix npm permissions: [npm docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)

### Config file errors

**Symptoms:**
- Can't read config
- Invalid JSON errors

**Solution:**
```bash
# Remove corrupt config
rm ~/.checkout/config.json

# Reconfigure
checkout
```

### Journal directory doesn't exist

**Cause:** Directory was moved or deleted

**Solution:**

Either recreate the directory:
```bash
mkdir -p ~/journals
```

Or update config to new location:
```bash
nano ~/.checkout/config.json
# Edit journalDir value
```

### Tests failing

**Solution:**
```bash
cd checkout
rm -rf node_modules
npm install
npm test
```

## Development Setup

For contributors or those wanting to modify the code:

### Install Dev Dependencies

```bash
npm install
```

This includes:
- `jest` - Test runner
- `eslint` - Linting

### Run Tests

```bash
npm test
```

### Run Linter

```bash
npm run lint
```

### Watch Mode (Development)

```bash
# In one terminal, run tests in watch mode
npm test -- --watch

# In another terminal, test your changes
checkout
```

Changes to the code are immediately reflected since you used `npm link`.

## Advanced Configuration

### Multiple Journal Locations

Checkout currently supports one journal directory. For multiple journals:

**Option 1: Multiple configs (manual)**
```bash
# Backup current config
cp ~/.checkout/config.json ~/.checkout/config-work.json

# Create personal config
nano ~/.checkout/config-personal.json

# Swap configs as needed
cp ~/.checkout/config-work.json ~/.checkout/config.json
```

**Option 2: Separate installations**

Clone checkout to different directories, each with its own npm link name (requires package.json modification).

### Sync with Cloud Storage

Point journal directory to a synced folder:

```bash
# Dropbox example
ln -s ~/Dropbox/journals ~/journals

# Update config
nano ~/.checkout/config.json
# Set journalDir to ~/Dropbox/journals
```

### Git Integration (Manual)

Initialize git in your journal directory:

```bash
cd ~/journals
git init
echo ".DS_Store" > .gitignore
git add .
git commit -m "Initial journal commit"
```

Create git commits manually or use hooks (future feature).

## Next Steps

Once setup is complete:

1. **Create your first entry:** `checkout`
2. **Read the command reference:** [COMMANDS.md](COMMANDS.md)
3. **Learn the file format:** See README.md File Format section
4. **Import existing journals:** `checkout import <path>`

## Getting Help

- **View help:** `checkout --help`
- **Check version:** `checkout --version`
- **View config:** `checkout config`
- **Validate setup:** `checkout validate`

Happy journaling! 🌙
