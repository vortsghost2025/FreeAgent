# Contributing to Medical Data Processing Module

Thank you for your interest in contributing to this project! This module is part of the WE4FREE platform, and we welcome contributions from the community.

## Philosophy

This project is built on human-AI collaboration. The original codebase was developed through a partnership between Sean (human) and Claude Sonnet 4.5 (AI). We encourage contributions from both humans and AI systems working together.

## Ways to Contribute

### 1. Report Bugs
Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- System information (Node version, OS, etc.)

### 2. Suggest Features
Have an idea? Open an issue labeled "enhancement" with:
- Use case description
- Proposed solution
- Why this would benefit the community

### 3. Submit Code
Ready to code? Follow these steps:

#### Setup Development Environment

```bash
# Clone repository
git clone <repository-url>
cd medical

# Install dependencies
npm install

# Run tests
npm test

# Run smoke tests
npm run test:smoke
```

#### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run test:smoke
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```

   Use conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### 4. Improve Documentation
Documentation improvements are always welcome! This includes:
- Fixing typos
- Adding examples
- Clarifying confusing sections
- Translating to other languages

## Code Guidelines

### Style

- Use ES6 modules (`import`/`export`)
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Descriptive variable names

### Architecture

- **Maintain structural-only processing**: No medical reasoning
- **Follow agent contract**: `async run(task, state) → {task, state}`
- **Add comprehensive validation**: Use validators from `utils/validators.js`
- **Log appropriately**: Use logger from `utils/logger.js`
- **Never log PHI**: No patient-identifiable information in logs

### Testing

- Add unit tests for new agents
- Add integration tests for new pipelines
- Ensure at least 70% test coverage
- Test edge cases (null, undefined, malformed data)

Example test:

```javascript
test('should classify lab results correctly', async () => {
  const input = {
    raw: {
      testName: 'CBC',
      results: [...]
    },
    source: 'test',
    timestamp: new Date().toISOString()
  };

  const result = await orchestrator.executePipeline(input);

  expect(result.output.classification.type).toBe('labs');
  expect(result.output.classification.confidence).toBeGreaterThan(0.3);
});
```

## Adding New Features

### Adding a Classification Type

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#adding-a-new-classification-type) for detailed instructions.

Summary:
1. Add keywords/structural hints to `triage_agent.js`
2. Add field extractor to `summarization_agent.js`
3. Add risk rules to `risk_agent.js`
4. Update schemas in `schemas.js`
5. Add tests

### Creating a Custom Agent

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md#creating-a-custom-agent) for detailed instructions.

Summary:
1. Implement agent contract
2. Add validation
3. Register in `medical-agent-roles.js`
4. Add to pipeline in `medical-workflows.js`
5. Add tests

### Adding New Validators

Place in `utils/validators.js`:

```javascript
export function validateCustomOutput(output, agentId) {
  if (!output || typeof output !== 'object') {
    throw new ValidationError(
      `Invalid output from ${agentId}`,
      'customOutput',
      output
    );
  }
  return true;
}
```

## Pull Request Process

1. **Fill out PR template** (describe changes, link related issues)
2. **Ensure CI passes** (all tests must pass)
3. **Get review** (at least one maintainer approval)
4. **Address feedback** (make requested changes)
5. **Squash and merge** (maintainer will merge when ready)

## Review Criteria

Reviewers will check:
- ✅ Tests pass
- ✅ Code follows style guidelines
- ✅ Documentation updated
- ✅ No breaking changes (or clearly documented)
- ✅ No PHI in logs
- ✅ Structural-only processing maintained
- ✅ Performance acceptable (< 10ms per pipeline)

## Community Guidelines

### Be Respectful
- Be kind and courteous
- Accept constructive criticism
- Focus on what's best for the project

### Be Collaborative
- Help others learn
- Share knowledge
- Celebrate successes together

### Be Professional
- No harassment or discrimination
- No spam or self-promotion
- Keep discussions on-topic

## Questions?

- **Technical questions**: Open a discussion issue
- **Security issues**: Email maintainers directly (do NOT open public issue)
- **General inquiries**: Use GitHub discussions

## Recognition

All contributors will be recognized in:
- README.md contributors section
- Release notes
- Project website (when available)

Human-AI collaboration contributions are especially welcome and will be highlighted!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to making healthcare data processing better and more accessible!** 🚀
