# Publishing Checkout to GitHub & npm

This guide covers the steps to publish Checkout Journal to GitHub and optionally to npm.

## ✅ Pre-Publication Checklist (Completed)

All these items have been completed and committed:

- ✅ **LICENSE** - MIT License
- ✅ **CONTRIBUTING.md** - Contribution guidelines
- ✅ **package.json** - Repository URLs and metadata
- ✅ **.npmignore** - npm package exclusions
- ✅ **GitHub Issue Templates** - Bug reports and feature requests
- ✅ **README badges** - Version, license, Node.js, tests
- ✅ **Enhanced README** - Support links, contributing section

## Step 1: Create GitHub Repository

### Option A: Via GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `checkout`
3. Description: "Evening reflection journal for presence and joy"
4. Public repository
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Option B: Via GitHub CLI

```bash
gh repo create checkout --public --description "Evening reflection journal for presence and joy"
```

## Step 2: Push to GitHub

After creating the repository on GitHub:

```bash
# Add remote
git remote add origin https://github.com/rickarm/checkout.git

# Push all commits
git push -u origin main

# Push tags (if any)
git push --tags
```

## Step 3: Configure GitHub Repository

### Enable Features

1. Go to repository Settings
2. Enable:
   - ✅ Issues
   - ✅ Discussions (optional, for community Q&A)
   - ✅ Wiki (optional)

### Add Topics

Add relevant topics for discoverability:
- `cli`
- `journal`
- `journaling`
- `reflection`
- `mindfulness`
- `markdown`
- `nodejs`
- `terminal`
- `wellness`
- `gratitude`

### Create Initial Release

1. Go to "Releases" → "Create a new release"
2. Tag version: `v1.0.0`
3. Release title: `v1.0.0 - Initial Release`
4. Description:
   ```markdown
   ## 🌙 Checkout Journal v1.0.0

   First public release of Checkout - a lightweight CLI journaling app for 5-minute evening reflection.

   ### Features
   - ✨ Guided prompts for evening reflection
   - 🫁 Breathing exercise
   - 📁 Organized markdown storage
   - 📋 Browsable index with wiki-style links
   - 📥 Import existing entries
   - ✅ Entry validation
   - 🧪 Test mode for practice runs

   ### Installation
   ```bash
   npm install -g @rickarm/checkout
   checkout --help
   ```

   ### Documentation
   - [README](https://github.com/rickarm/checkout#readme)
   - [Commands Reference](https://github.com/rickarm/checkout/blob/main/docs/COMMANDS.md)
   - [Setup Guide](https://github.com/rickarm/checkout/blob/main/docs/SETUP.md)

   Happy journaling! 🌙
   ```
5. Click "Publish release"

## Step 4: (Optional) Publish to npm

### Prerequisites

1. Create npm account: https://www.npmjs.com/signup
2. Login to npm:
   ```bash
   npm login
   ```

### Check Package Before Publishing

```bash
# Test what will be published
npm pack

# Extract and inspect
tar -xzf rickarm-checkout-1.0.0.tgz
ls -la package/
```

### Publish

```bash
# Dry run first
npm publish --dry-run

# Publish for real
npm publish --access public
```

**Note:** Publishing to npm is optional. Users can install directly from GitHub:
```bash
npm install -g github:rickarm/checkout
```

## Step 5: Post-Publication Tasks

### Update README Badges

Once published, the badges will work automatically:
- npm version badge
- License badge
- Tests badge

### Create GitHub Pages (Optional)

For a project website:

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `docs` folder
4. Create `docs/index.html` or use Jekyll

### Set Up GitHub Actions (Optional)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14, 16, 18, 20]
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install
      - run: npm test
```

### Add Funding (Optional)

Create `.github/FUNDING.yml`:

```yaml
# GitHub Sponsors
github: rickarm

# Other funding links
# ko_fi: username
# patreon: username
```

## Step 6: Promote Your Project

### Social Media

Share on:
- Twitter/X
- Reddit (r/productivity, r/journaling, r/selfimprovement)
- Hacker News (Show HN)
- Dev.to

### Community

- Add to awesome lists:
  - [awesome-cli-apps](https://github.com/agarrharr/awesome-cli-apps)
  - [awesome-journaling](https://github.com/topics/journaling)
- Product Hunt launch
- Write a blog post

### Example Social Post

```
🌙 Checkout Journal - A 5-minute CLI for evening reflection

Just published my journaling app for the terminal!

✨ Guided prompts
🫁 Breathing exercise
📁 Markdown storage
🔗 Wiki-style index for Obsidian

Free & open source
npm install -g @rickarm/checkout

https://github.com/rickarm/checkout

#cli #journaling #opensource
```

## Maintenance

### Version Updates

When making changes:

1. Update version in `package.json`
2. Update CHANGELOG (create if needed)
3. Commit changes
4. Create git tag: `git tag v1.0.1`
5. Push: `git push && git push --tags`
6. Create GitHub release
7. Publish to npm: `npm publish`

### Responding to Issues

- Acknowledge within 24-48 hours
- Use issue templates to triage
- Label appropriately (bug, enhancement, question)
- Link to relevant documentation
- Be friendly and helpful

### Pull Request Review

- Run tests locally
- Check code quality
- Verify documentation updates
- Test the feature/fix
- Provide constructive feedback
- Thank contributors!

## Support Channels

- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and community
- Twitter/X - Updates and announcements

## Analytics (Optional)

Track adoption:
- npm download stats: https://npm-stat.com/charts.html?package=@rickarm/checkout
- GitHub stars, forks, watchers
- Issue/PR activity

## Future Enhancements

Consider for v1.1:
- [ ] Git auto-commit feature
- [ ] Search entries command
- [ ] Export to different formats
- [ ] Multiple journal templates
- [ ] Streaks and statistics
- [ ] Cloud sync option

## Need Help?

- npm publishing: https://docs.npmjs.com/cli/v8/commands/npm-publish
- GitHub guides: https://guides.github.com/
- Open source guides: https://opensource.guide/

---

**Ready to publish?** Follow Steps 1-2 above to get started!

Good luck! 🚀
