const normalizeRequirementValue = (value) => String(value ?? '').trim();

export const getInsuranceRequirementKey = ({ purpose, inquiryType }) =>
  `${normalizeRequirementValue(purpose)}:${normalizeRequirementValue(inquiryType)}`;

export const buildInsuranceRequirementSpecs = ({ draft, latestInquiry }) => {
  const candidates = [
    {
      purpose: draft?.purpose,
      inquiryType: draft?.inquiryType,
    },
    latestInquiry
      ? {
          purpose: latestInquiry.purpose,
          inquiryType: latestInquiry.inquiryType,
        }
      : null,
  ].filter(Boolean);
  const uniqueSpecs = new Map();

  candidates.forEach((candidate) => {
    const purpose = normalizeRequirementValue(candidate.purpose);
    const inquiryType = normalizeRequirementValue(candidate.inquiryType);

    if (!purpose || !inquiryType) {
      return;
    }

    const key = getInsuranceRequirementKey({ purpose, inquiryType });
    uniqueSpecs.set(key, {
      key,
      purpose,
      inquiryType,
    });
  });

  return [...uniqueSpecs.values()];
};
