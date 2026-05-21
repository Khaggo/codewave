import { expect } from '@playwright/test';

import { formatLongUiDateLabel, qaAccounts, runtimeConfig, seededVehicle } from './config.mjs';
import { addFinding, selectOptionContaining } from './assertions.mjs';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function xpathLiteral(value) {
  const text = String(value);
  if (!text.includes("'")) {
    return `'${text}'`;
  }
  if (!text.includes('"')) {
    return `"${text}"`;
  }

  return `concat(${text
    .split("'")
    .map((part) => `'${part}'`)
    .join(', "\"\'\"", ')})`;
}

function formatWorkbenchDateButtonLabel(scheduledDate) {
  const [year, month, day] = String(scheduledDate).split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

async function fillDateInputReliably(page, dateInput, scheduledDate, { testInfo } = {}) {
  let wasOverwritten = false;
  let lastValue = '';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await dateInput.fill(scheduledDate);
    await page.waitForTimeout(1_200);
    lastValue = await dateInput.inputValue();

    if (lastValue === scheduledDate) {
      if (wasOverwritten && testInfo) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Job Orders date input can be overwritten by the workbench auto-focus after staff type a target schedule date, causing the queue to jump to an older handoff date.',
        });
      }
      return;
    }

    wasOverwritten = true;
  }

  const dateButton = page.locator('button').filter({ hasText: formatWorkbenchDateButtonLabel(scheduledDate) }).first();
  if (await dateButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await dateButton.click();
    await page.waitForTimeout(1_200);
    lastValue = await dateInput.inputValue();

    if (lastValue === scheduledDate) {
      if (testInfo) {
        addFinding(testInfo, {
          severity: 'high',
          summary:
            'Job Orders date input can be overwritten by auto-focus; selecting the marked date chip restores the intended booking date.',
        });
      }
      return;
    }
  }

  if (wasOverwritten && testInfo) {
    addFinding(testInfo, {
      severity: 'critical',
      summary:
        'Job Orders date input is forcibly reset to an older queue date after staff enter the target booking date, blocking job-order creation for the selected handoff.',
    });
  }
  expect(lastValue, 'Schedule date should remain on the booking date selected by staff.').toBe(scheduledDate);
}

function bookingCardByNote(page, noteMarker) {
  return page
    .locator(
      `xpath=//div[contains(concat(" ", normalize-space(@class), " "), " px-5 ") and contains(concat(" ", normalize-space(@class), " "), " py-4 ")][.//*[contains(normalize-space(.), ${xpathLiteral(noteMarker)})]]`,
    )
    .first();
}

export async function loginStaff(page, account, startPath = '/bookings') {
  await page.goto(`${runtimeConfig.staffBaseUrl}${startPath}`);

  const emailInput = page.getByPlaceholder('email@example.com');
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(account.email);
  await page.getByPlaceholder('Enter your password').fill(account.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await Promise.race([
    page.getByRole('heading', { name: /Booking Schedule|Job Orders|QA Audit|Invoices & Orders/i }).waitFor(),
    page.getByRole('heading', { name: 'This workspace is not available for your role.' }).waitFor(),
  ]);
}

export async function loginMobileCustomer(page, account) {
  await page.goto(runtimeConfig.mobileBaseUrl);

  const emailInput = page.getByPlaceholder('Email');
  if (!(await emailInput.isVisible().catch(() => false))) {
    const signInEntryPoint = page.getByText('Sign in', { exact: true }).last();
    if (await signInEntryPoint.isVisible().catch(() => false)) {
      await signInEntryPoint.click();
    }
  }

  await emailInput.fill(account.email);
  await page.getByPlaceholder('Password').fill(account.password);
  await page.getByText('Sign in', { exact: true }).last().click();
  await page.getByText('Book Service', { exact: true }).waitFor();
}

export async function createMobileBooking(
  page,
  { serviceName, serviceNames = null, alreadySelectedServiceNames = [], timeSlotLabel, scheduledDate, noteMarker },
) {
  await page.getByText('Book Service', { exact: true }).click();
  await waitForMobileBookingComposer(page);

  const vehicleCard = page.getByText(seededVehicle.plateNumber, { exact: false }).first();
  if (await vehicleCard.isVisible().catch(() => false)) {
    await vehicleCard.click();
  } else {
    await page.getByText(seededVehicle.label, { exact: false }).first().click();
  }

  const requestedServiceNames = Array.isArray(serviceNames) && serviceNames.length
    ? serviceNames
    : serviceName
      ? [serviceName]
      : [];

  for (const requestedServiceName of requestedServiceNames) {
    if (alreadySelectedServiceNames.includes(requestedServiceName)) {
      continue;
    }

    await page.getByText(requestedServiceName, { exact: true }).first().click();
    await page.waitForTimeout(300);
  }
  await page.getByText(timeSlotLabel, { exact: true }).first().click();
  await selectMobileBookingDate(page, scheduledDate);
  await page.getByPlaceholder(/Optional notes for the service team/i).fill(noteMarker);
  const submitBookingButton = page.getByText(/^(Book Appointment|Submit Booking Request)$/, { exact: true }).last();
  await submitBookingButton.scrollIntoViewIfNeeded();
  await submitBookingButton.click();
  await page.getByText(noteMarker, { exact: false }).waitFor();
  await page.getByText('Reservation Fee', { exact: true }).waitFor();
}

async function waitForMobileBookingComposer(page) {
  const readinessChecks = [
    () => page.getByText('Choose Services', { exact: true }).isVisible().catch(() => false),
    () => page.getByText('Step 1: Choose Services', { exact: true }).isVisible().catch(() => false),
    () => page.getByText('Step 2: Select Vehicle', { exact: true }).isVisible().catch(() => false),
    () => page.getByText('Select Vehicle', { exact: true }).isVisible().catch(() => false),
    () => page.getByText('Available Services', { exact: true }).isVisible().catch(() => false),
    () => page.getByText('Discover & Track', { exact: true }).isVisible().catch(() => false),
  ];

  await expect
    .poll(
      async () => {
        for (const check of readinessChecks) {
          if (await check()) {
            return true;
          }
        }

        return false;
      },
      {
        message: 'Mobile booking composer should be visible after opening Book Service',
        timeout: 20_000,
      },
    )
    .toBeTruthy();
}

async function ensureMobileBookingModuleVisible(page) {
  const bookingHeadingCandidates = [
    page.getByText('Service Booking', { exact: true }),
    page.getByText('Discover & Track', { exact: true }),
  ];

  const isBookingModuleVisible = async () => {
    for (const candidate of bookingHeadingCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return true;
      }
    }

    return false;
  };

  if (await isBookingModuleVisible()) {
    return;
  }

  await expect
    .poll(
      async () => {
        if (await isBookingModuleVisible()) {
          return true;
        }

        const navigationAttempts = [
          page.getByText('Book', { exact: true }).last(),
          page.getByText('Service Booking', { exact: true }).first(),
          page.getByText(/^(View Status|Pay Now)$/, { exact: true }).first(),
          page.getByText('Book Service', { exact: true }).first(),
          page.getByText('Open module', { exact: true }).first(),
        ];

        for (const candidate of navigationAttempts) {
          if (await candidate.isVisible().catch(() => false)) {
            await candidate.click().catch(() => null);

            if (await isBookingModuleVisible()) {
              return true;
            }
          }
        }

        return false;
      },
      {
        message: 'Mobile booking module should become visible while reopening tracked bookings',
        timeout: 20_000,
      },
    )
    .toBeTruthy();
}

async function waitForTrackedBookingHistory(page, bookingReference) {
  await expect
    .poll(
      async () => {
        if (await page.getByText(bookingReference, { exact: true }).first().isVisible().catch(() => false)) {
          return true;
        }

        const readinessChecks = [
          () => page.getByText('Active and Past Bookings', { exact: true }).isVisible().catch(() => false),
          () => page.getByText('Track Progress', { exact: true }).isVisible().catch(() => false),
          () => page.getByText('Loading active services', { exact: true }).isVisible().catch(() => false),
          () => page.getByText('No bookings yet', { exact: true }).isVisible().catch(() => false),
        ];

        for (const check of readinessChecks) {
          if (await check()) {
            return true;
          }
        }

        return false;
      },
      {
        message: `Tracked booking history should become visible for ${bookingReference}`,
        timeout: 20_000,
      },
    )
    .toBeTruthy();
}

async function restoreMobileCustomerSessionIfNeeded(page, { testInfo } = {}) {
  const signInButton = page.getByText('Sign in', { exact: true }).last();
  const createAccountButton = page.getByText('Create account', { exact: true }).first();
  const marketingLandingMarker = page.getByText('Featured modules', { exact: true });
  const bookingSignInGuard = page.getByText('Sign in to continue booking', { exact: true });

  const isSignedOutLanding =
    (await signInButton.isVisible().catch(() => false)) &&
    ((await createAccountButton.isVisible().catch(() => false)) ||
      (await marketingLandingMarker.isVisible().catch(() => false)));
  const isBookingSignInGuardVisible = await bookingSignInGuard.isVisible().catch(() => false);

  if (!isSignedOutLanding && !isBookingSignInGuardVisible) {
    return;
  }

  if (testInfo) {
    addFinding(testInfo, {
      severity: 'high',
      summary:
        'Mobile web did not restore the saved customer session after refresh; QA had to sign in again before reopening the tracked booking history.',
    });
  }

  await loginMobileCustomer(page, qaAccounts.customer);
}

async function selectMobileBookingDate(page, scheduledDate) {
  const selectedDateLabel = formatLongUiDateLabel(scheduledDate);
  const selectedDateSummary = page.getByText(selectedDateLabel, { exact: true }).first();

  if (await selectedDateSummary.isVisible().catch(() => false)) {
    return;
  }

  const [, , day] = String(scheduledDate).split('-').map(Number);
  const dayCardNumber = page.getByText(String(day), { exact: true }).first();

  await dayCardNumber.scrollIntoViewIfNeeded();
  await dayCardNumber.click();
  await selectedDateSummary.waitFor();
}

function getMobileBookingReference(bookingOrId) {
  if (bookingOrId && typeof bookingOrId === 'object') {
    if (bookingOrId.bookingReference) {
      return `#${bookingOrId.bookingReference}`;
    }

    const compactDate = String(bookingOrId.scheduledDate ?? '').replace(/-/g, '');
    const plateToken = String(bookingOrId.plateNumber ?? seededVehicle.plateNumber ?? 'PENDING')
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase();

    if (compactDate) {
      return `#BK-${compactDate}-${plateToken || 'PENDING'}`;
    }
  }

  const bookingId = String(bookingOrId ?? '');
  return `#${bookingId.slice(0, 8).toUpperCase()}`;
}

function hasReadableJobOrderReference(optionLabel) {
  return /\bJO[-\s·]/i.test(String(optionLabel ?? ''));
}

function hasExpectedJobOrderDate(optionLabel, scheduledDate) {
  if (!scheduledDate) {
    return true;
  }

  const compactDate = String(scheduledDate ?? '')
    .slice(0, 10)
    .replace(/-/g, '');

  return !compactDate || String(optionLabel ?? '').includes(compactDate);
}

async function selectJobOrderOptionById(selectLocator, { jobOrderId, scheduledDate, testInfo, label = 'Job order' }) {
  const legacyUuidReference = `JO-${jobOrderId.slice(0, 8).toUpperCase()}`;
  let optionLabel = '';

  await expect
    .poll(
      async () => {
        optionLabel = await selectLocator.evaluate((select, targetJobOrderId) => {
          const option = Array.from(select.options).find((entry) => entry.value === targetJobOrderId);
          return option?.textContent?.trim() ?? '';
        }, jobOrderId);

        return Boolean(optionLabel);
      },
      {
        message: `${label} option for ${jobOrderId} should be available`,
        timeout: 30_000,
      },
    )
    .toBeTruthy();

  if (!hasReadableJobOrderReference(optionLabel) && testInfo) {
    addFinding(testInfo, {
      severity: 'high',
      summary: `${label} selector option for ${jobOrderId} is missing a business-readable JO reference.`,
    });
  }

  if (optionLabel.includes(legacyUuidReference) && testInfo) {
    addFinding(testInfo, {
      severity: 'medium',
      summary: `${label} selector still exposes a UUID-derived job-order reference (${legacyUuidReference}) instead of a business-readable identifier.`,
    });
  }

  if (!hasExpectedJobOrderDate(optionLabel, scheduledDate) && testInfo) {
    addFinding(testInfo, {
      severity: 'medium',
      summary: `${label} selector option did not include the expected work-date reference date ${scheduledDate}.`,
    });
  }

  const duplicateLabelCount = await selectLocator.evaluate((select, visibleLabel) => {
    const normalizedLabel = String(visibleLabel ?? '').trim();
    return Array.from(select.options).filter((entry) => entry.textContent?.trim() === normalizedLabel).length;
  }, optionLabel);

  if (duplicateLabelCount > 1 && testInfo) {
    addFinding(testInfo, {
      severity: 'high',
      summary: `${label} selector shows duplicate visible labels (${optionLabel}), which can make same-day job orders hard for staff to distinguish.`,
    });
  }

  await selectLocator.evaluate((select, targetJobOrderId) => {
    select.value = targetJobOrderId;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }, jobOrderId);

  return optionLabel;
}

export async function openTrackedBooking(page, bookingOrId, { forceRefresh = false, testInfo } = {}) {
  const bookingReference = getMobileBookingReference(bookingOrId);

  if (forceRefresh) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null);
  }

  if (!forceRefresh && (await page.getByText(bookingReference, { exact: true }).isVisible().catch(() => false))) {
    return;
  }

  await restoreMobileCustomerSessionIfNeeded(page, { testInfo });
  await ensureMobileBookingModuleVisible(page);

  if (await page.getByText('Sign in to continue booking', { exact: true }).isVisible().catch(() => false)) {
    if (testInfo) {
      addFinding(testInfo, {
        severity: 'critical',
        summary:
          'Mobile customer session is not retained after refresh; booking history is blocked by the booking sign-in guardrail.',
      });
    }
  }

  const trackProgressTab = page.getByText(/^(Active Services|Track Progress)$/, { exact: true }).first();
  if (await trackProgressTab.isVisible().catch(() => false)) {
    await trackProgressTab.click();
  }

  await waitForTrackedBookingHistory(page, bookingReference);
  await page.getByText(bookingReference, { exact: true }).first().click();
}

async function openStaffBookingsOnDate(page, scheduledDate) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/bookings`);
  await page.getByRole('heading', { name: 'Booking Schedule' }).waitFor();

  if (scheduledDate) {
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill(scheduledDate);
    await expect(dateInput).toHaveValue(scheduledDate);
  }
}

async function waitForStaffBookingCardByNote(page, noteMarker, { timeoutMs = 45_000 } = {}) {
  const startedAt = Date.now();
  const bookingCard = bookingCardByNote(page, noteMarker);

  while (Date.now() - startedAt < timeoutMs) {
    if (await bookingCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return bookingCard;
    }

    const refreshButton = page.getByRole('button', { name: /Refresh/i }).first();
    if (await refreshButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await refreshButton.click();
    } else {
      await page.reload();
    }

    await page.waitForTimeout(1_500);
  }

  await expect(bookingCard).toBeVisible();
  return bookingCard;
}

export async function confirmReservationPaymentFromBookings(page, { noteMarker, scheduledDate }) {
  await openStaffBookingsOnDate(page, scheduledDate);
  const bookingCard = await waitForStaffBookingCardByNote(page, noteMarker);
  await bookingCard.getByRole('button', { name: 'Accept Counter Payment' }).click();
  const modalConfirm = page.getByRole('button', { name: 'Confirm reservation payment' });
  if (await modalConfirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await modalConfirm.click();
  }
  await expect(bookingCard).toContainText('Paid');
}

export async function sendBookingToWorkshop(page, { noteMarker, scheduledDate }) {
  await openStaffBookingsOnDate(page, scheduledDate);
  const bookingCard = await waitForStaffBookingCardByNote(page, noteMarker);
  await bookingCard.getByRole('button', { name: 'Send To Workshop' }).click();
  await expect(bookingCard.locator('span.badge').filter({ hasText: 'Workshop Handoff' })).toBeVisible();
}

export async function createJobOrderFromHandoff(
  page,
  { bookingId, bookingReference, scheduledDate, technicianCode, noteMarker, testInfo, expectMixedSourceDate = false },
) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/job-orders`);
  await page.getByRole('heading', { name: 'Job Orders' }).waitFor();

  const expectedBookingReference =
    bookingReference || `BK-${String(scheduledDate ?? '').replace(/-/g, '')}-${seededVehicle.plateNumber}`;
  const dateInput = page.getByRole('textbox', { name: 'Schedule date' });
  await fillDateInputReliably(page, dateInput, scheduledDate, { testInfo });

  if (expectMixedSourceDate) {
    const mixedSourceGuidance = page.getByText('Choose the exact source for this shared queue date', {
      exact: true,
    });
    const existingJobOrderGuidance = page.getByText('Existing job order selection', { exact: true });
    const bookingHandoffGuidance = page.getByText('Booking handoff selection', { exact: true });
    const guidanceVisible =
      (await mixedSourceGuidance.isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await existingJobOrderGuidance.isVisible({ timeout: 3_000 }).catch(() => false)) &&
      (await bookingHandoffGuidance.isVisible({ timeout: 3_000 }).catch(() => false));

    if (!guidanceVisible && testInfo) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'This run covers a mixed Job Orders queue date where an existing job order and a new booking handoff share the same work date; advisers still need clearer source-picking UX in this state.',
      });
    }
  }

  const sourceBookingCard = page
    .locator(
      `xpath=//div[p[normalize-space(.)="Source booking"] and p[contains(normalize-space(.), "${expectedBookingReference}")]]`,
    )
    .first();

  if (!(await sourceBookingCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
    const handoffCard = page.locator('button').filter({ hasText: expectedBookingReference }).first();
    if (!(await handoffCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      if (testInfo) {
        addFinding(testInfo, {
          severity: 'critical',
          summary:
            'Job Orders did not render the selected booking handoff in either the create workspace or source picker after staff moved the booking to workshop handoff.',
        });
      }
    }
    await handoffCard.waitFor();
    await handoffCard.click();
  }

  await expect(sourceBookingCard, 'Create workspace should be bound to the selected booking handoff.').toBeVisible();

  if (noteMarker) {
    await expect(page.getByRole('textbox', { name: 'Job-order notes' })).toHaveValue(
      new RegExp(escapeRegExp(noteMarker)),
    );
  }

  const assigneeSelect = page.locator('select').filter({ hasText: 'Create as draft - assign later' }).first();
  await selectOptionContaining(assigneeSelect, technicianCode);

  const createResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && /\/api\/job-orders$/.test(response.url()),
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Create Job Order - adviser/admin' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Job order creation failed with ${createResponse.status()}`).toBeTruthy();

  const jobOrder = await createResponse.json();
  if (jobOrder?.sourceId !== bookingId && testInfo) {
    addFinding(testInfo, {
      severity: 'critical',
      summary:
        'Job Orders created a job order from a different booking handoff than the visibly selected source, which can attach workshop work to the wrong customer booking.',
    });
  }
  expect(jobOrder?.sourceId, 'Created job order should be linked to the selected booking handoff.').toBe(bookingId);

  return jobOrder;
}

export async function loadJobOrderById(page, { jobOrderId, technicianView = false, scheduledDate, testInfo }) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/job-orders`);
  await page.getByRole('heading', { name: 'Job Orders' }).waitFor();

  if (scheduledDate) {
    const dateInput = page.locator('input[type="date"]').first();
    await fillDateInputReliably(page, dateInput, scheduledDate, { testInfo });
  }

  const comboboxLabel = technicianView ? 'Assigned job order' : 'Job-order lookup';
  const select = page.getByRole('combobox', { name: comboboxLabel });
  await selectJobOrderOptionById(select, {
    jobOrderId,
    scheduledDate,
    testInfo,
    label: comboboxLabel,
  });
  const detailResponsePromise = page
    .waitForResponse(
      (response) => response.request().method() === 'GET' && response.url().includes(`/api/job-orders/${jobOrderId}`),
      { timeout: 30_000 },
    )
    .catch(() => null);
  await page.getByRole('button', { name: 'Load Job Order' }).click();
  await detailResponsePromise;
}

export async function progressJobOrderForQa(page, { evidencePath, progressMessage, testInfo }) {
  await page.getByRole('textbox', { name: 'Progress message' }).fill(progressMessage);

  const completionCheckbox = page.locator('input[type="checkbox"]').first();
  if ((await completionCheckbox.count()) > 0) {
    if (await completionCheckbox.isChecked()) {
      await completionCheckbox.uncheck();
    }
  }

  await page.getByRole('button', { name: 'Save Progress Entry - technician/head tech' }).click();

  const uploadEvidenceButton = page.getByText('Upload Photo Evidence - workshop', { exact: true });
  if (!(await uploadEvidenceButton.isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.getByRole('button', { name: /Evidence/i }).first().click();
  }
  await uploadEvidenceButton.waitFor();
  const evidenceTargetSelect = page.getByLabel('Evidence target');
  const selectedEvidenceTarget = await evidenceTargetSelect.evaluate((select) => {
    const options = Array.from(select.options).map((option) => ({
      label: option.textContent?.trim() ?? '',
      value: option.value,
    }));
    const itemTarget =
      options.find((option) => option.label.includes('Preventive Maintenance')) ??
      options.find((option) => !/general job-order evidence/i.test(option.label));
    const fallbackTarget = options.find((option) => /general job-order evidence/i.test(option.label)) ?? options[0];
    const target = itemTarget ?? fallbackTarget;

    if (!target) {
      return null;
    }

    select.value = target.value;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));

    return target.label;
  });

  expect(selectedEvidenceTarget, 'Evidence target should offer at least one upload destination.').toBeTruthy();

  if (/general job-order evidence/i.test(selectedEvidenceTarget) && testInfo) {
    addFinding(testInfo, {
      severity: 'medium',
      summary:
        'Technician evidence upload only exposed the general job-order target in this run; work-item evidence targets were not available for the selected service/checklist state.',
    });
  }

  await page.locator('input[type="file"]').setInputFiles(evidencePath);
  const uploadResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      return request.method() === 'POST' && /\/api\/job-orders\/[^/]+\/photos\/upload$/.test(response.url());
    },
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Upload Photo Evidence - workshop' }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), `Photo evidence upload failed with ${uploadResponse.status()}`).toBeTruthy();

  const uploadedJobOrder = await uploadResponse.json();
  expect(
    uploadedJobOrder?.photos?.length ?? 0,
    'Photo evidence upload response should include the newly attached work-item evidence.',
  ).toBeGreaterThan(0);

  const successFeedback = page.getByText('Photo evidence uploaded', { exact: false });
  if (!(await successFeedback.isVisible({ timeout: 2_000 }).catch(() => false))) {
    if (testInfo) {
      addFinding(testInfo, {
        severity: 'medium',
        summary:
          'Photo evidence upload succeeds, but the success message is not reliably visible because the workbench refreshes or changes stage immediately after upload.',
      });
    }
  }

  await page.getByRole('button', { name: /Progress/i }).first().click();
  await page.getByRole('textbox', { name: 'Progress message' }).fill(`${progressMessage} Work item completed.`);
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Save Progress Entry - technician/head tech' }).click();
  await page.getByText('Progress entry saved', { exact: false }).waitFor();

  await page.locator('#job-order-stage-progress').getByRole('button', { name: 'Send to QA' }).click();
  await page.locator('span.badge').filter({ hasText: 'Ready For QA' }).waitFor();
}

export async function recordQaVerdict(page, { jobOrderId, scheduledDate, note, testInfo }) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/qa-audit`);
  const select = page.getByRole('combobox', { name: 'Job order' });
  await selectJobOrderOptionById(select, {
    jobOrderId,
    scheduledDate,
    testInfo,
    label: 'QA Audit job order',
  });
  await page.getByRole('button', { name: 'Load Review' }).click();
  await page.getByRole('combobox', { name: 'Verdict' }).selectOption('passed');
  await page.getByRole('textbox', { name: 'Note' }).fill(note);
  await page.getByRole('button', { name: 'Record Verdict' }).click();
  await page.getByText('QA Verdict Recorded', { exact: true }).waitFor();
}

export async function finalizeAndRecordPayment(page, { jobOrderId, scheduledDate, summary, amount, reference, testInfo }) {
  await loadJobOrderById(page, { jobOrderId, scheduledDate, testInfo });
  await page.getByRole('textbox', { name: 'Finalization summary' }).fill(summary);
  await page.getByRole('spinbutton', { name: 'Amount received (PHP)' }).fill(String(amount));
  await page.getByRole('textbox', { name: 'Payment reference' }).fill(reference);
  await page.getByRole('button', { name: 'Finalize Invoice-Ready Work - adviser/admin' }).click();
  await page.locator('.status-message').filter({ hasText: 'Invoice-ready record' }).waitFor();

  const paymentButton = page.getByRole('button', { name: 'Record Manual Payment - adviser/admin' });
  if (await paymentButton.isEnabled()) {
    await paymentButton.click();
    await page.getByText('Invoice payment recorded', { exact: false }).waitFor();
  }
}

export async function verifyInvoiceLookup(page, jobOrderId, { scheduledDate, testInfo } = {}) {
  await page.goto(`${runtimeConfig.staffBaseUrl}/admin/invoices`);
  const select = page.getByRole('combobox', { name: 'Service record' });
  try {
    await selectJobOrderOptionById(select, {
      jobOrderId,
      scheduledDate,
      testInfo,
      label: 'Invoice service record',
    });
  } catch (error) {
    if (testInfo) {
      addFinding(testInfo, {
        severity: 'high',
        summary:
          'Invoices & Orders did not surface the just-finalized service record in the Service Record selector; staff may lose the record when the work date is outside the current invoice lookup month or options are stale.',
      });
    }

    throw error;
  }
  await page.getByRole('button', { name: 'Load Service' }).click();
  await page.getByText('Payment Entries', { exact: true }).waitFor();
}

export async function expectTextPresent(page, text) {
  await expect(page.getByText(text, { exact: false })).toBeVisible();
}
