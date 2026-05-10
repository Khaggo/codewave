export const buildProvisioningErrors = (form) => {
  const errors = {}

  if (form.password.trim().length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.'
  if (form.phone.trim() && form.phone.trim().length > 30) errors.phone = 'Phone number is too long.'

  return errors
}

export const buildStatusErrors = (form) => {
  const errors = {}

  if (!form.userId.trim()) errors.userId = 'Choose a staff account.'
  if (form.reason.trim().length > 160) errors.reason = 'Reason is too long.'

  return errors
}

export const formatEmailPreviewName = (firstName) =>
  String(firstName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32) || 'firstname'

export const summarizeManagedAccounts = (accounts) =>
  accounts.reduce(
    (summary, account) => ({
      total: summary.total + 1,
      activeCount: summary.activeCount + (account.isActive ? 1 : 0),
      inactiveCount: summary.inactiveCount + (account.isActive ? 0 : 1),
      adminCount: summary.adminCount + (account.role === 'super_admin' ? 1 : 0),
    }),
    {
      total: 0,
      activeCount: 0,
      inactiveCount: 0,
      adminCount: 0,
    },
  )
