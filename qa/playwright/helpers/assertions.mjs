import { expect } from '@playwright/test';

export function annotateSeverity(testInfo, severity, summary) {
  testInfo.annotations.push({ type: 'qa-severity', description: severity });
  if (summary) {
    testInfo.annotations.push({ type: 'qa-summary', description: summary });
  }
}

export function addFinding(testInfo, finding) {
  testInfo.annotations.push({
    type: 'qa-finding',
    description: JSON.stringify(finding),
  });
}

export async function expectVisible(page, locator, label) {
  await expect(locator, label).toBeVisible();
}

export async function selectOptionContaining(selectLocator, optionText, { timeout = 30_000 } = {}) {
  await expect
    .poll(
      async () =>
        selectLocator.evaluate((select, partialLabel) =>
          Array.from(select.options).some((entry) => entry.textContent?.includes(partialLabel)),
        optionText),
      {
        message: `Option containing "${optionText}" should be available`,
        timeout,
      },
    )
    .toBeTruthy();

  await selectLocator.evaluate((select, partialLabel) => {
    const option = Array.from(select.options).find((entry) =>
      entry.textContent?.includes(partialLabel),
    );

    if (!option) {
      throw new Error(`Could not find option containing "${partialLabel}"`);
    }

    select.value = option.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, optionText);
}
