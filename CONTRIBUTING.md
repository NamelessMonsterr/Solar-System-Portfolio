# 🤝 Contributing to Interactive 3D Solar System Portfolio

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. We expect all contributors to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

---

## 🚀 How to Contribute

### Ways to Contribute

1. **Report Bugs** - Found a bug? Let us know!
2. **Suggest Features** - Have an idea? We'd love to hear it
3. **Improve Documentation** - Help make our docs better
4. **Write Code** - Submit bug fixes or new features
5. **Review Pull Requests** - Help review code from others

---

## 💻 Development Setup

### Prerequisites

- **Python 3.x** (for local server) OR
- **Node.js 16+** (alternative)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Git

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/yourusername/portfolio-website.git
cd portfolio-website

# 2. Create a new branch
git checkout -b feature/your-feature-name

# 3. Start local development server
python -m http.server 8080
# OR
npx serve .

# 4. Open in browser
# http://localhost:8080
```

### Project Structure

```
Portfolio Website/
├── index.html                 # Main HTML file with embedded CSS
├── js/
│   └── main.js               # Core application logic
├── resources/
│   ├── solar_system.glb      # 3D solar system model
│   ├── spaceships/           # Spaceship models
│   └── project_map.json      # Content configuration
├── manifest.json             # PWA manifest
├── favicon.svg               # Site icon
└── docs/                     # Documentation
```

---

## 💎 Code Standards

### JavaScript Style Guide

#### Naming Conventions

```javascript
// Variables: camelCase
let spaceshipPosition = new THREE.Vector3();
let isFlying = false;

// Constants: UPPER_SNAKE_CASE
const MODELS_PATH = "resources/";
const MAX_SPEED = 10;

// Functions: camelCase, descriptive
function flyToPlanet(planetEntry) {}
function updateSpaceshipPosition() {}

// Classes: PascalCase (if added)
class SpaceshipController {}
```

#### Code Organization

- Group related variables together
- Add section comments for major blocks
- Keep functions focused and small (<100 lines)
- Use descriptive variable names

#### Error Handling

```javascript
// Always use try-catch for async operations
try {
  const data = await loadAsset();
  processData(data);
} catch (error) {
  console.error("[Component] Error:", error);
  showUserFriendlyError();
}
```

### HTML/CSS Standards

#### Accessibility First

```html
<!-- Always include ARIA labels -->
<button aria-label="Close dialog" onclick="closeDialog()">✕</button>

<!-- Use semantic HTML -->
<nav aria-label="Main navigation">
  <button role="menuitem">Home</button>
</nav>

<!-- Proper heading hierarchy -->
<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

#### CSS Organization

- Use consistent spacing (2 spaces)
- Group related styles together
- Mobile-first responsive design
- Use CSS custom properties for colors/spacing

### Security Standards

#### Never Trust User Input

```javascript
// ❌ BAD - XSS vulnerability
element.innerHTML = userInput;

// ✅ GOOD - Safe
element.textContent = userInput;

// ✅ GOOD - Use createElement for structure
const div = document.createElement("div");
div.textContent = userInput;
parent.appendChild(div);
```

#### Sanitize All External Data

```javascript
// When loading external content
const safeTitle = DOMPurify.sanitize(data.title);
// OR use textContent for display
```

---

## 🧪 Testing Guidelines

### Before Submitting

1. **Manual Testing**

   - Test on Chrome, Firefox, Safari
   - Test on mobile devices (responsive)
   - Check browser console for errors
   - Verify all features work

2. **Automated Testing**

   - Run `npx playwright test` (if implemented)
   - Ensure all tests pass
   - Add tests for new features

3. **Performance Testing**
   - Check FPS (should be 60 on desktop)
   - Monitor memory usage
   - Test load times

### Writing Tests

See [AUTOMATED_TESTING.md](AUTOMATED_TESTING.md) for comprehensive testing guide.

```javascript
// Example test
test("should load spaceship model", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.spaceship !== null);

  const hasSpaceship = await page.evaluate(() => {
    return window.spaceship && window.spaceship.position;
  });

  expect(hasSpaceship).toBe(true);
});
```

---

## 📝 Pull Request Process

### 1. Before Creating PR

- [ ] Create a feature branch (`feature/add-new-ship`)
- [ ] Write clear, descriptive commit messages
- [ ] Test thoroughly on multiple browsers
- [ ] Update documentation if needed
- [ ] Add comments to complex code

### 2. Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

**Example:**

```
feat(spaceship): add new fighter spaceship model

- Added F-22 inspired fighter model
- Implemented new particle effects for fighter
- Updated spaceship selector UI

Closes #42
```

### 3. Creating the Pull Request

1. **Title**: Clear, concise description
2. **Description**:
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
   - Screenshots (if UI changes)
3. **Link Related Issues**: "Closes #123" or "Fixes #456"

### 4. PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on mobile
- [ ] No console errors
- [ ] Performance checked

## Screenshots (if applicable)

Add screenshots here

## Checklist

- [ ] Code follows project style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
```

### 5. Review Process

- Maintainers will review within 3-5 days
- Address feedback promptly
- Keep discussions professional and constructive
- Once approved, maintainers will merge

---

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues** - Check if already reported
2. **Use latest version** - Update and test again
3. **Reproduce consistently** - Ensure it's reproducible

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
If applicable, add screenshots

**Environment**

- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Device: [e.g., Desktop, iPhone 12]
- Version: [e.g., 1.3.0]

**Console Errors**
Paste any console errors here

**Additional Context**
Any other relevant information
```

---

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature

**Problem It Solves**
What user problem does this address?

**Proposed Solution**
How would you implement this?

**Alternatives Considered**
What other solutions did you think about?

**Additional Context**
Mockups, examples, or related features

**Priority**
How important is this? (Low/Medium/High)
```

---

## 🎨 Design Contributions

### Adding New Spaceships

1. Create 3D model in `.glb` format
2. Keep file size under 15MB
3. Ensure proper UV mapping
4. Test in Three.js viewer first
5. Place in `resources/spaceships/`
6. Update `SPACESHIP_MODELS` array in main.js

### UI/UX Improvements

1. Follow existing design language
2. Maintain accessibility (ARIA labels, contrast)
3. Test on multiple screen sizes
4. Provide before/after screenshots
5. Explain design decisions

---

## 📚 Documentation Contributions

### Types of Documentation Needed

- Code comments for complex functions
- README improvements
- Tutorial/guide creation
- API documentation
- Architecture diagrams

### Documentation Style

- Use Markdown for all docs
- Include code examples
- Add screenshots/diagrams where helpful
- Keep language clear and concise
- Proofread for grammar/spelling

---

## 🏆 Recognition

Contributors will be:

- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

---

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Chat**: Join our Discord (if available)
- **Email**: contact@example.com

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to make this project better!** 🚀
