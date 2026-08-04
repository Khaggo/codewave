const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const philippineMobilePattern = /^09\d{9}$/;

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

export const normalizePhoneNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('63')) {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return `0${digits}`;
  }
  return digits.slice(0, 11);
};

export const validateEmail = (value) => {
  const email = normalizeEmail(value);
  if (!email) {
    return 'Enter your email address.';
  }
  return emailPattern.test(email) ? '' : 'Enter a valid email address.';
};

export const validatePhoneNumber = (value) => {
  const phoneNumber = normalizePhoneNumber(value);
  if (!phoneNumber) {
    return 'Enter your phone number.';
  }
  return philippineMobilePattern.test(phoneNumber)
    ? ''
    : 'Use an 11-digit PH mobile number starting with 09.';
};

export const formatMoney = (amountCents, currency = 'PHP', locale = 'en-PH') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(Number(amountCents ?? 0) / 100);
