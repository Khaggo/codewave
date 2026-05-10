export const customerMobileGuardMessages = {
  unauthorized_session:
    'Sign in with a customer account before opening that mobile workspace.',
  staff_session_blocked:
    'This mobile app is for customer accounts only. Staff roles should use the web portal.',
  deactivated_customer_blocked:
    'This customer account is deactivated. Contact support if access should be restored.',
};

export const isCustomerMobileRole = (role) => !role || role === 'customer';

export const isTechnicianMobileRole = (role) => role === 'technician';

export const getCustomerMobileSessionAccessState = (account) => {
  if (!account?.accessToken || !account?.userId) {
    return 'unauthorized_session';
  }

  if (!isCustomerMobileRole(account.role)) {
    return 'staff_session_blocked';
  }

  if (account.isActive === false) {
    return 'deactivated_customer_blocked';
  }

  return 'customer_session_active';
};

export const isTechnicianMobileSessionActive = (account) =>
  Boolean(account?.accessToken) &&
  Boolean(account?.userId) &&
  isTechnicianMobileRole(account?.role) &&
  account?.isActive !== false;

export const getMobileAppSessionAccessState = (account) => {
  if (isTechnicianMobileSessionActive(account)) {
    return 'technician_session_active';
  }

  return getCustomerMobileSessionAccessState(account);
};

export const assertMobileAppSessionAllowed = (account) => {
  const accessState = getMobileAppSessionAccessState(account);

  if (
    accessState === 'customer_session_active' ||
    accessState === 'technician_session_active'
  ) {
    return accessState;
  }

  throw new Error(
    customerMobileGuardMessages[accessState] ??
      customerMobileGuardMessages.staff_session_blocked,
  );
};
