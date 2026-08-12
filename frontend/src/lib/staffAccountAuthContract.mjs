const restrictedDestination = '/api/auth/password/change-required'

export const stripCredentialSecrets = (value = {}) => {
  const { password, passwordHash, temporaryPassword, ...safeValue } = value
  return safeValue
}

export const normalizeStaffLoginResponse = (response, normalizeSession) => {
  if (response?.requiresPasswordChange !== true) return normalizeSession(response)

  if (!response.passwordChangeToken || response.destination !== restrictedDestination) {
    throw new Error('The temporary-password response is incomplete.')
  }

  return {
    requiresPasswordChange: true,
    passwordChangeToken: response.passwordChangeToken,
    destination: restrictedDestination,
    expiresInSeconds: response.expiresInSeconds,
  }
}

export const isCredentialDeliveryFailure = (error) =>
  error?.status === 503 && error?.details?.code === 'STAFF_CREDENTIAL_DELIVERY_FAILED'

export const credentialRetryTarget = (error) =>
  isCredentialDeliveryFailure(error) ? error.details?.delivery?.targetEmail ?? '' : ''
