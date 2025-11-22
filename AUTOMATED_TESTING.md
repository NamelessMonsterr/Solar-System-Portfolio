# 🧪 Automated Testing Guide

## Overview

This guide covers automated testing strategies for the Interactive 3D Solar System Portfolio.

---

## 🛠️ Recommended Testing Stack

### Unit Testing

- **Framework**: [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/)
- **Purpose**: Test individual functions and utilities

### E2E Testing

- **Framework**: [Playwright](https://playwright.dev/) (recommended)
- **Alternative**: [Cypress](https://www.cypress.io/)
- **Purpose**: Test user interactions and full workflows

### Visual Regression Testing

- **Tool**: [Percy](https://percy.io/) or [Chromatic](https://www.chromatic.com/)
- **Purpose**: Catch visual bugs automatically

---

## 📦 Setup Instructions

### 1. Install Dependencies

```bash
# For Playwright (recommended)
npm init -y
npm install -D @playwright/test
npx playwright install

# For additional testing tools
npm install -D vitest @vitest/ui
```

### 2. Create Test Configuration

Create `playwright.config.js`:

```javascript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: "python -m http.server 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 🧪 Sample Test Suites

### tests/initialization.spec.js

```javascript
import { test, expect } from "@playwright/test";

test.describe("Initialization Tests", () => {
  test("should load page without errors", async ({ page }) => {
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForSelector("#glCanvas", { timeout: 10000 });

    expect(errors).toHaveLength(0);
  });

  test("should load Three.js successfully", async ({ page }) => {
    await page.goto("/");

    const threeLoaded = await page.evaluate(() => {
      return typeof window.THREE !== "undefined";
    });

    expect(threeLoaded).toBe(true);
  });

  test("should display loading overlay initially", async ({ page }) => {
    await page.goto("/");

    const loadingOverlay = await page.locator("#loading-overlay");
    await expect(loadingOverlay).toBeVisible();
  });

  test("should hide loading overlay after models load", async ({ page }) => {
    await page.goto("/");

    // Wait for loading to complete (max 30 seconds)
    await page.waitForFunction(
      () => {
        const overlay = document.getElementById("loading-overlay");
        return overlay && overlay.style.display === "none";
      },
      { timeout: 30000 }
    );

    const loadingOverlay = await page.locator("#loading-overlay");
    await expect(loadingOverlay).toBeHidden();
  });
});
```

### tests/controls.spec.js

```javascript
import { test, expect } from "@playwright/test";

test.describe("Controls Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for scene to be ready
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });
  });

  test("WASD keys should move spaceship", async ({ page }) => {
    // Get initial position
    const initialPos = await page.evaluate(() => {
      return {
        x: window.spaceship.position.x,
        y: window.spaceship.position.y,
        z: window.spaceship.position.z,
      };
    });

    // Press W key for forward movement
    await page.keyboard.down("w");
    await page.waitForTimeout(500);
    await page.keyboard.up("w");

    // Get new position
    const newPos = await page.evaluate(() => {
      return {
        x: window.spaceship.position.x,
        y: window.spaceship.position.y,
        z: window.spaceship.position.z,
      };
    });

    // Position should have changed
    const moved =
      Math.abs(initialPos.x - newPos.x) > 0.01 ||
      Math.abs(initialPos.y - newPos.y) > 0.01 ||
      Math.abs(initialPos.z - newPos.z) > 0.01;

    expect(moved).toBe(true);
  });

  test("should show control hints", async ({ page }) => {
    const controlHint = await page.locator("#control-hint");
    await expect(controlHint).toBeVisible();
    await expect(controlHint).toContainText("WASD");
  });

  test("should switch spaceships", async ({ page }) => {
    const spaceshipBtn = await page.locator('.spaceship-btn[data-index="1"]');
    await spaceshipBtn.click();

    // Wait for model to load
    await page.waitForTimeout(1000);

    // Check if active class switched
    await expect(spaceshipBtn).toHaveClass(/active/);
  });
});
```

### tests/planet-interaction.spec.js

```javascript
import { test, expect } from "@playwright/test";

test.describe("Planet Interaction Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });
  });

  test("should open planet overlay on click", async ({ page }) => {
    // Click Start Tour button to navigate to first planet
    await page.click("#start-tour-btn");

    // Wait for arrival at first planet
    await page.waitForTimeout(5000);

    // Overlay should appear
    const overlay = await page.locator("#planet-overlay");
    await expect(overlay).toHaveClass(/active/);
  });

  test("should close overlay with Escape key", async ({ page }) => {
    await page.click("#start-tour-btn");
    await page.waitForTimeout(5000);

    const overlay = await page.locator("#planet-overlay");
    await expect(overlay).toHaveClass(/active/);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    await expect(overlay).not.toHaveClass(/active/);
  });

  test("should display planet information", async ({ page }) => {
    await page.click("#start-tour-btn");
    await page.waitForTimeout(5000);

    const overlayContent = await page.locator("#planet-overlay-content");
    await expect(overlayContent).toContainText(
      /Mercury|Venus|Earth|Mars|Jupiter|Saturn/
    );
  });
});
```

### tests/tour-mode.spec.js

```javascript
import { test, expect } from "@playwright/test";

test.describe("Tour Mode Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });
  });

  test("should start tour when button clicked", async ({ page }) => {
    await page.click("#start-tour-btn");

    // Check if tour is active
    const isTourActive = await page.evaluate(() => window.isTourActive);
    expect(isTourActive).toBe(true);
  });

  test("should show Next Planet button during tour", async ({ page }) => {
    await page.click("#start-tour-btn");
    await page.waitForTimeout(5000);

    const nextBtn = await page.locator("#planet-next-btn");
    await expect(nextBtn).toBeVisible();
  });

  test("should progress through planets", async ({ page }) => {
    await page.click("#start-tour-btn");

    // Wait for first planet
    await page.waitForTimeout(5000);

    // Click next
    await page.click("#planet-next-btn");

    // Should navigate to second planet
    await page.waitForTimeout(5000);

    const tourIndex = await page.evaluate(() => window.tourIndex);
    expect(tourIndex).toBeGreaterThan(0);
  });
});
```

### tests/performance.spec.js

```javascript
import { test, expect } from "@playwright/test";

test.describe("Performance Tests", () => {
  test("should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });

    const loadTime = Date.now() - startTime;

    // Should load within 15 seconds on normal connection
    expect(loadTime).toBeLessThan(15000);
  });

  test("should maintain acceptable FPS", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });

    // Measure FPS over 2 seconds
    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const startTime = performance.now();

        function count() {
          frames++;
          if (performance.now() - startTime < 2000) {
            requestAnimationFrame(count);
          } else {
            resolve(frames / 2);
          }
        }

        requestAnimationFrame(count);
      });
    });

    // Should be at least 30 FPS
    expect(fps).toBeGreaterThan(30);
  });

  test("should not have memory leaks", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });

    const metrics1 = await page.metrics();

    // Interact with the page
    for (let i = 0; i < 5; i++) {
      await page.click("#start-tour-btn");
      await page.waitForTimeout(2000);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    const metrics2 = await page.metrics();

    // Memory should not increase dramatically (less than 50MB)
    const memoryIncrease =
      (metrics2.JSHeapUsedSize - metrics1.JSHeapUsedSize) / 1024 / 1024;
    expect(memoryIncrease).toBeLessThan(50);
  });
});
```

### tests/accessibility.spec.js

```javascript
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility Tests", () => {
  test("should not have any automatically detectable accessibility issues", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should have proper ARIA labels", async ({ page }) => {
    await page.goto("/");

    const canvas = await page.locator("#glCanvas");
    const ariaLabel = await canvas.getAttribute("aria-label");
    expect(ariaLabel).toBeTruthy();
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => window.hasInitialized === true, {
      timeout: 30000,
    });

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const activeElement = await page.evaluate(() => document.activeElement.id);
    expect(activeElement).toBeTruthy();
  });
});
```

---

## 🚀 Running Tests

### Run all tests

```bash
npx playwright test
```

### Run tests in headed mode (see browser)

```bash
npx playwright test --headed
```

### Run specific test file

```bash
npx playwright test tests/controls.spec.js
```

### Run tests in specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug mode

```bash
npx playwright test --debug
```

### Generate HTML report

```bash
npx playwright show-report
```

---

## 📊 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/tests.yml`:

```yaml
name: Automated Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## ✅ Test Coverage Goals

- **Initialization**: 100%
- **Controls**: 90%+
- **Planet Interactions**: 95%+
- **Tour Mode**: 90%+
- **Performance**: All metrics passing
- **Accessibility**: Zero violations

---

## 📝 Best Practices

1. **Test in isolation** - Each test should be independent
2. **Use realistic data** - Test with actual project_map.json content
3. **Test error states** - Verify graceful error handling
4. **Visual regression** - Catch UI bugs before deployment
5. **Performance budgets** - Set and enforce performance limits
6. **Accessibility** - Run a11y tests on every build

---

## 🔄 Continuous Improvement

- Run tests on every commit
- Review failing tests immediately
- Add tests for new features
- Update tests when behavior changes
- Monitor test execution time

---

**Testing Status:** Ready for Implementation  
**Recommended Framework:** Playwright (cross-browser, fast, reliable)
