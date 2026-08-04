const insecureSeedPasswords = new Set([
  'password',
  'password1',
  'password1.',
  'changeme',
  'change-me',
  'secret',
])

export const requireSeedPassword = (
  value: string | undefined,
  environmentVariable: string,
): string => {
  const password = value ?? ''
  const normalizedPassword = password.trim().toLowerCase()

  if (!normalizedPassword) {
    throw new Error(
      `${environmentVariable} is required when executing this account seed`,
    )
  }

  if (password.length < 12 || insecureSeedPasswords.has(normalizedPassword)) {
    throw new Error(
      `${environmentVariable} must contain at least 12 characters and cannot use a known placeholder`,
    )
  }

  return password
}
