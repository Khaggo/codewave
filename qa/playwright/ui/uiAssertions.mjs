import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

export const expectNoHorizontalOverflow = async (page) => {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

export const expectNoSeriousAccessibilityViolations = async (page) => {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousViolations = results.violations.filter(({ impact }) => (
    impact === 'serious' || impact === 'critical'
  ));

  expect(seriousViolations).toEqual([]);
};

export const expectElementsNotToOverlap = async (first, second) => {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();

  const overlapWidth = Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width)
    - Math.max(firstBox.x, secondBox.x);
  const overlapHeight = Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height)
    - Math.max(firstBox.y, secondBox.y);

  expect(overlapWidth > 1 && overlapHeight > 1).toBe(false);
};

export const expectMinimumTargetSize = async (locator, minimum = 44) => {
  const targets = await locator.all();
  expect(targets.length).toBeGreaterThan(0);

  for (const target of targets) {
    const box = await target.boundingBox();
    if (!box) continue;
    const label = await target.getAttribute('aria-label') ?? await target.textContent();
    expect.soft(box.width, `Target width for ${label}`).toBeGreaterThanOrEqual(minimum);
    expect.soft(box.height, `Target height for ${label}`).toBeGreaterThanOrEqual(minimum);
  }
};
