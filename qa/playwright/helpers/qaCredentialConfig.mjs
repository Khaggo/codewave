export function requireConfiguredQaPassword(label, candidates = []) {
  const password = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.length > 0,
  )

  if (!password) {
    throw new Error(
      `Missing ${label} QA password. Configure a role-specific QA password or BOOKING_JOB_ORDER_QA_PASSWORD before running Playwright.`,
    )
  }

  return password
}
