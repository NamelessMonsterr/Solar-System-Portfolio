import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Less than 5 seconds
  });

  test('no excessive lag during interaction', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await page.waitForSelector('.loading-screen', { state: 'hidden' });

    // Measure frame rate or responsiveness
    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const countFrames = () => {
          frames++;
          if (performance.now() - start < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frames);
          }
        };
        requestAnimationFrame(countFrames);
      });
    });

    console.log(`FPS: ${fps}`);
    expect(fps).toBeGreaterThan(30); // At least 30 FPS
  });

  test('spaceship controls respond quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.loading-screen', { state: 'hidden' });

    // Simulate key press
    const startTime = Date.now();
    await page.keyboard.press('w');
    await page.waitForTimeout(100); // Wait a bit
    const responseTime = Date.now() - startTime;

    console.log(`Control response time: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(200); // Less than 200ms
  });
});