import type { Page } from 'playwright';

/* ─── Random number helpers ─── */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Wait for a random duration between min and max milliseconds.
 * Uses gaussian-ish distribution to cluster around the midpoint.
 */
export async function randomDelay(min: number, max: number): Promise<void> {
  // Box-Muller for more human-like distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  const mean = (min + max) / 2;
  const stddev = (max - min) / 6;
  const delay = Math.round(Math.max(min, Math.min(max, mean + gaussian * stddev)));

  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Simulate human-like scrolling down a page.
 * Scrolls in random increments with pauses.
 */
export async function simulateScroll(page: Page): Promise<void> {
  const viewportHeight = page.viewportSize()?.height ?? 900;
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);

  let currentScroll = 0;
  const maxScrolls = 20; // safety cap
  let scrollCount = 0;

  while (currentScroll < totalHeight && scrollCount < maxScrolls) {
    // Random scroll distance: 100-500px
    const scrollAmount = randInt(100, Math.min(500, viewportHeight));
    const scrollDuration = randInt(200, 600);

    await page.evaluate(
      ({ amount, duration }) => {
        return new Promise<void>((resolve) => {
          const start = window.scrollY;
          const target = start + amount;
          const startTime = performance.now();

          function step(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-in-out cubic
            const ease =
              progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            window.scrollTo(0, start + (target - start) * ease);
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(step);
        });
      },
      { amount: scrollAmount, duration: scrollDuration },
    );

    currentScroll += scrollAmount;
    scrollCount++;

    // Random pause between scrolls
    await randomDelay(300, 1200);

    // Occasionally pause longer (simulating reading)
    if (Math.random() < 0.15) {
      await randomDelay(2000, 5000);
    }

    // Occasionally scroll back up a bit
    if (Math.random() < 0.08 && currentScroll > viewportHeight) {
      const backAmount = randInt(50, 200);
      await page.evaluate((amt) => window.scrollBy(0, -amt), backAmount);
      currentScroll -= backAmount;
      await randomDelay(500, 1000);
    }
  }
}

/**
 * Simulate natural mouse movement using Bezier curves.
 */
export async function simulateMouseMovement(page: Page): Promise<void> {
  const viewport = page.viewportSize() ?? { width: 1280, height: 900 };
  const steps = randInt(3, 7);

  for (let i = 0; i < steps; i++) {
    const targetX = randInt(100, viewport.width - 100);
    const targetY = randInt(100, viewport.height - 100);
    const moveSteps = randInt(10, 30);

    await page.mouse.move(targetX, targetY, { steps: moveSteps });
    await randomDelay(100, 400);

    // Occasionally hover over a link or button
    if (Math.random() < 0.3) {
      const elements = await page.$$('a, button, input');
      if (elements.length > 0) {
        const target = elements[randInt(0, elements.length - 1)]!;
        const box = await target.boundingBox();
        if (box) {
          await page.mouse.move(
            box.x + box.width / 2 + randFloat(-5, 5),
            box.y + box.height / 2 + randFloat(-5, 5),
            { steps: randInt(8, 20) },
          );
          await randomDelay(200, 800);
        }
      }
    }
  }
}

/**
 * Returns a random viewport size from a realistic distribution.
 */
export function randomViewport(): { width: number; height: number } {
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1280, height: 720 },
    { width: 1600, height: 900 },
    { width: 2560, height: 1440 },
    { width: 1280, height: 800 },
    { width: 1680, height: 1050 },
    { width: 1360, height: 768 },
    { width: 1920, height: 1200 },
    { width: 1280, height: 1024 },
  ];
  return viewports[randInt(0, viewports.length - 1)]!;
}

/**
 * Returns a random realistic user agent string.
 * Weighted toward modern Chrome/Firefox/Edge.
 */
export function randomUserAgent(): string {
  const chromeVersions = ['120.0.6099.109', '121.0.6167.85', '122.0.6261.69', '123.0.6312.59', '124.0.6367.91'];
  const firefoxVersions = ['121.0', '122.0', '123.0', '124.0', '125.0'];
  const edgeVersions = ['120.0.2210.91', '121.0.2277.83', '122.0.2365.66', '123.0.2420.81'];

  const platform = Math.random();
  let os: string;
  if (platform < 0.72) {
    os = 'Windows NT 10.0; Win64; x64';
  } else if (platform < 0.87) {
    os = 'Macintosh; Intel Mac OS X 10_15_7';
  } else {
    os = 'X11; Linux x86_64';
  }

  const browserType = Math.random();
  if (browserType < 0.65) {
    const ver = chromeVersions[randInt(0, chromeVersions.length - 1)]!;
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver} Safari/537.36`;
  } else if (browserType < 0.82) {
    const ver = firefoxVersions[randInt(0, firefoxVersions.length - 1)]!;
    return `Mozilla/5.0 (${os}; rv:${ver}) Gecko/20100101 Firefox/${ver}`;
  } else {
    const ver = edgeVersions[randInt(0, edgeVersions.length - 1)]!;
    const chromeBase = chromeVersions[randInt(0, chromeVersions.length - 1)]!;
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeBase} Safari/537.36 Edg/${ver}`;
  }
}
