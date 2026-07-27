import {
  normalizeEmail,
  normalizePhoneNumber,
  validateEmail,
  validatePhoneNumber,
} from '@codewave/domain-utils';

export {
  normalizeEmail,
  normalizePhoneNumber,
  validateEmail,
  validatePhoneNumber,
} from '@codewave/domain-utils';

const licensePlateBodyRegex = /^[A-Z0-9 -]+$/;
export const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const normalizeVehicleYear = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 4);
export const normalizeLicensePlate = (value) =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 20)
    .trimStart();

export const formatVehicleDisplayName = ({ vehicleMake, vehicleModel, vehicleYear }) =>
  [vehicleYear, vehicleMake, vehicleModel]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');

export const buildUsername = (email, firstName, lastName) => {
  const emailLocalPart = normalizeEmail(email).split('@')[0]?.replace(/[^a-z0-9._-]/gi, '');

  if (emailLocalPart) {
    return emailLocalPart.toLowerCase();
  }

  return `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
};

export const formatDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  return `${monthLabels[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
};

export const formatMonthYear = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  return `${monthLabels[value.getMonth()]} ${value.getFullYear()}`;
};

const parseDateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00`
    : value.trim();
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
};

export const cloneDate = (value) => {
  return parseDateValue(value);
};

export const calculateAge = (birthday) => {
  if (!(birthday instanceof Date) || Number.isNaN(birthday.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDifference = today.getMonth() - birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  return age;
};

export const getPasswordChecks = (password) => {
  const value = password || '';

  return {
    hasValidLength: value.length >= 8 && value.length <= 14,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecialCharacter: /[^A-Za-z0-9]/.test(value),
  };
};

export const isPasswordValid = (password) => {
  const checks = getPasswordChecks(password);

  return Object.values(checks).every(Boolean);
};

export const validateOptionalPhoneNumber = (phoneNumber) => {
  const digits = normalizePhoneNumber(phoneNumber);

  if (!digits) {
    return '';
  }

  return validatePhoneNumber(digits);
};

export const validateLicensePlate = (licensePlate) => {
  const normalizedPlate = normalizeLicensePlate(licensePlate).trim();
  const compactPlate = normalizedPlate.replace(/[^A-Z0-9]/g, '');

  if (!normalizedPlate) {
    return 'Enter your vehicle plate.';
  }

  if (!licensePlateBodyRegex.test(normalizedPlate)) {
    return 'Use only letters, numbers, spaces, or hyphens for the vehicle plate.';
  }

  if (compactPlate.length < 4 || compactPlate.length > 10) {
    return 'Use 4-10 letters or numbers for the vehicle plate.';
  }

  return '';
};

export const validateBirthday = (birthday) => {
  if (!(birthday instanceof Date) || Number.isNaN(birthday.getTime())) {
    return 'Select your birthday.';
  }

  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (birthday > normalizedToday) {
    return 'Birthday cannot be in the future.';
  }

  return '';
};

export const validateVehicleYear = (vehicleYear) => {
  const digits = normalizeVehicleYear(vehicleYear);
  const numericYear = Number(digits);
  const currentYear = new Date().getFullYear();

  if (!digits) {
    return 'Enter your vehicle year.';
  }

  if (digits.length !== 4 || Number.isNaN(numericYear)) {
    return 'Use a valid 4-digit vehicle year.';
  }

  if (numericYear < 1900 || numericYear > currentYear + 1) {
    return 'Vehicle year must be between 1900 and next year.';
  }

  return '';
};

export const validatePassword = (password) => {
  if (!password) {
    return 'Enter your password.';
  }

  if (!isPasswordValid(password)) {
    return 'Use 8-14 characters with uppercase, lowercase, number, and special character.';
  }

  return '';
};

export const validateRegisterForm = (form) => {
  const errors = {};

  if (!form.firstName.trim()) {
    errors.firstName = 'Enter your first name.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Enter your last name.';
  }

  const emailError = validateEmail(form.email);
  if (emailError) {
    errors.email = emailError;
  }

  const phoneError = validatePhoneNumber(form.phoneNumber);
  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  const birthdayError = validateBirthday(form.birthday);
  if (birthdayError) {
    errors.birthday = birthdayError;
  }

  const licensePlateError = validateLicensePlate(form.licensePlate);
  if (licensePlateError) {
    errors.licensePlate = licensePlateError;
  }

  if (!form.vehicleMake.trim()) {
    errors.vehicleMake = 'Enter your vehicle make.';
  }

  if (!form.vehicleModel.trim()) {
    errors.vehicleModel = 'Enter your vehicle model.';
  }

  const vehicleYearError = validateVehicleYear(form.vehicleYear);
  if (vehicleYearError) {
    errors.vehicleYear = vehicleYearError;
  }

  const passwordError = validatePassword(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Re-enter your password.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

export const validateProfileForm = (form) => {
  const errors = {};

  const phoneError = validatePhoneNumber(form.phoneNumber);
  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  if (!form.address.trim()) {
    errors.address = 'Enter your address.';
  }

  const licensePlateError = validateLicensePlate(form.licensePlate);
  if (licensePlateError) {
    errors.licensePlate = licensePlateError;
  }

  if (!form.vehicleMake.trim()) {
    errors.vehicleMake = 'Enter your vehicle make.';
  }

  if (!form.vehicleModel.trim()) {
    errors.vehicleModel = 'Enter your vehicle model.';
  }

  const vehicleYearError = validateVehicleYear(form.vehicleYear);
  if (vehicleYearError) {
    errors.vehicleYear = vehicleYearError;
  }

  return errors;
};

export const validateLoginForm = (form) => {
  const errors = {};
  const emailError = validateEmail(form.email);

  if (emailError) {
    errors.email = emailError;
  }

  if (!form.password) {
    errors.password = 'Enter your password.';
  }

  return errors;
};

export const validateResetPasswordForm = (form) => {
  const errors = {};
  const passwordError = validatePassword(form.newPassword);

  if (passwordError) {
    errors.newPassword = passwordError;
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Re-enter your new password.';
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

export const validateChangePasswordForm = ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const errors = {};

  if (!currentPassword) {
    errors.currentPassword = 'Enter your current password.';
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    errors.newPassword = passwordError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Re-enter your new password.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};
