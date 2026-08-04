import { useEffect, useMemo, useState } from 'react';

import { getInsuranceRequirements } from '../../lib/insuranceClient';
import { buildInsuranceRequirementSpecs } from './insuranceRequirementsModel.mjs';

export default function useInsuranceRequirements({
  accessToken,
  draft,
  hasSession,
  latestInquiry,
}) {
  const [requirementsByKey, setRequirementsByKey] = useState({});
  const requirementSpecs = useMemo(
    () =>
      buildInsuranceRequirementSpecs({
        draft,
        latestInquiry,
      }),
    [
      draft?.inquiryType,
      draft?.purpose,
      latestInquiry?.inquiryType,
      latestInquiry?.purpose,
    ],
  );

  useEffect(() => {
    if (!hasSession) {
      return undefined;
    }

    let isMounted = true;
    const missingSpecs = requirementSpecs.filter(
      (spec) => !requirementsByKey[spec.key],
    );

    if (!missingSpecs.length) {
      return undefined;
    }

    Promise.all(
      missingSpecs.map(async (spec) => [
        spec.key,
        await getInsuranceRequirements({
          purpose: spec.purpose,
          inquiryType: spec.inquiryType,
          accessToken,
        }),
      ]),
    )
      .then((entries) => {
        if (isMounted) {
          setRequirementsByKey((current) => ({
            ...current,
            ...Object.fromEntries(entries),
          }));
        }
      })
      .catch(() => {
        // The existing local requirement matrix remains a temporary offline fallback.
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, hasSession, requirementSpecs, requirementsByKey]);

  return requirementsByKey;
}
