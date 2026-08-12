export const buildRequiredPasswordChangeErrors = ({ newPassword = '', confirmPassword = '' }) => {
  const errors = {}
  if (newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.'
  if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.'
  else if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
