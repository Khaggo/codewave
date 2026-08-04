export const customerMobileGuardMessages = {
  unauthorized_session:
    'Sign in with a customer account before opening that mobile workspace.',
  staff_session_blocked:
    'This mobile app is for customer accounts. Staff should use the web portal.',
  deactivated_customer_blocked:
    'This customer account is deactivated. Contact support if access should be restored.',
};

export const isCustomerMobileRole = (role) => role === 'customer';

export const resolveProtectedMobileAccount = ({ activeAccount } = {}) => {
  return activeAccount ?? null;
};

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

export const getMobileAppSessionAccessState = (account) => {
  return getCustomerMobileSessionAccessState(account);
};

export const assertMobileAppSessionAllowed = (account) => {
  const accessState = getMobileAppSessionAccessState(account);

  if (
    accessState === 'customer_session_active'
  ) {
    return accessState;
  }

  throw new Error(
    customerMobileGuardMessages[accessState] ??
      customerMobileGuardMessages.staff_session_blocked,
  );
};
