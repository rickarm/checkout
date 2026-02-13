# Contributing to Checkout Journal

Thank you for your interest in contributing to Checkout! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js v14 or higher
- npm v6 or higher
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/checkout.git
   cd checkout
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Link for local development:
   ```bash
   npm link
   ```

## Development Workflow

### Running Tests

```bash
npm test
```

All tests must pass before submitting a PR.

### Code Style

We use ESLint for code quality:

```bash
npm run lint
```

### Testing Your Changes

Use `checkout test` to verify the CLI works without creating files:

```bash
checkout test
```

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

Example: `feature/add-search-command`

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code refactoring
- `chore`: Maintenance

Examples:
```
feat(cli): add search command for finding entries

fix(validator): handle missing metadata gracefully

docs(readme): update installation instructions
```

### Pull Request Process

1. Create a new branch from `main`
2. Make your changes
3. Add/update tests as needed
4. Update documentation if needed
5. Run tests: `npm test`
6. Run linter: `npm run lint`
7. Commit your changes
8. Push to your fork
9. Open a Pull Request

### Pull Request Guidelines

- Clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- All tests passing
- No merge conflicts

## Code Organization

```
checkout/
├── bin/           # CLI entry point
├── lib/
│   ├── cli/       # CLI interface (commands, prompts, display)
│   ├── core/      # Core functionality (entry, storage, config)
│   ├── features/  # Feature modules (importer, validator, indexer)
│   └── templates/ # Question templates
└── tests/         # Test files
```

## Adding New Features

### New Commands

1. Add command definition in `lib/cli/commands.js`
2. Create handler function
3. Add tests in `tests/`
4. Update documentation in `README.md` and `docs/COMMANDS.md`
5. Update help text

### New Templates

1. Create JSON file in `lib/templates/`
2. Follow structure of `checkout-v1.json`
3. Update template selection in config
4. Add tests for template validation

## Testing Guidelines

- Write tests for all new features
- Aim for >80% code coverage
- Test both success and error cases
- Use descriptive test names

Example test structure:
```javascript
describe('Feature Name', () => {
  test('does something correctly', () => {
    // Arrange
    const input = setupInput();

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

## Documentation

Update documentation when:
- Adding new commands
- Changing existing behavior
- Adding configuration options
- Fixing bugs that affect usage

Files to update:
- `README.md` - Main documentation
- `docs/COMMANDS.md` - Command reference
- `docs/SETUP.md` - Setup instructions (if applicable)

## Reporting Issues

### Bug Reports

Include:
- Checkout version (`checkout --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Examples of similar features in other tools

## Questions?

- Open an issue for questions
- Check existing issues first
- Be respectful and constructive

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Give constructive feedback
- Focus on the problem, not the person

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Checkout! 🌙
