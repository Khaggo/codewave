import process from 'node:process';

import axe from 'axe-core';
import { chromium } from 'playwright';

const storyIds = [];
let runA11y = false;
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === '--story') {
    storyIds.push(process.argv[index + 1]);
    index += 1;
  } else if (argument === '--a11y') {
    runA11y = true;
  }
}

const origin = process.env.STORYBOOK_ORIGIN ?? 'http://127.0.0.1:6006';
const indexResponse = await fetch(`${origin}/index.json`, {
  signal: AbortSignal.timeout(10_000),
});
if (!indexResponse.ok) {
  throw new Error(`Storybook index returned HTTP ${indexResponse.status}`);
}

const storyIndex = await indexResponse.json();
const availableStories = Object.values(storyIndex.entries).filter(
  (entry) => entry.type === 'story',
);
const selectedStories = storyIds.length
  ? storyIds.map((storyId) => {
      const entry = storyIndex.entries[storyId];
      if (!entry || entry.type !== 'story') {
        throw new Error(`Storybook story not found: ${storyId}`);
      }
      return entry;
    })
  : availableStories;

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const story of selectedStories) {
    const page = await browser.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });

    try {
      const url = `${origin}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });
      if (!response?.ok()) {
        throw new Error(`Story iframe returned HTTP ${response?.status() ?? 'unknown'}`);
      }
      await page.locator('#storybook-root').waitFor({
        state: 'attached',
        timeout: 10_000,
      });
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#storybook-root');
          return Boolean(
            root
              && (root.children.length > 0 || root.textContent?.trim().length),
          );
        },
        undefined,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(250);

      if (runtimeErrors.length > 0) {
        throw new Error(runtimeErrors.join('\n'));
      }

      let violationCount = 0;
      if (runA11y) {
        await page.addScriptTag({ content: axe.source });
        const accessibility = await page.evaluate(async () => {
          for (let attempt = 0; attempt < 20; attempt += 1) {
            try {
              return await window.axe.run(document.querySelector('#storybook-root'), {
                resultTypes: ['violations'],
              });
            } catch (error) {
              if (!String(error?.message ?? error).includes('Axe is already running')) throw error;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
          throw new Error('Timed out waiting for the active Axe scan to finish.');
        });
        violationCount = accessibility.violations.length;
        if (violationCount > 0) {
          const details = accessibility.violations
            .map((violation) => {
              const nodes = violation.nodes
                .slice(0, 5)
                .map((node) => `${node.target.join(' ')}: ${node.failureSummary}`)
                .join('\n  ');
              return `${violation.id}: ${violation.help}\n  ${nodes}`;
            })
            .join('\n');
          throw new Error(`Accessibility violations:\n${details}`);
        }
      }

      results.push({
        storyId: story.id,
        status: 'passed',
        violationCount,
      });
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

console.log(
  JSON.stringify(
    {
      status: 'passed',
      storyCount: results.length,
      a11y: runA11y,
      stories: results,
    },
    null,
    2,
  ),
);
