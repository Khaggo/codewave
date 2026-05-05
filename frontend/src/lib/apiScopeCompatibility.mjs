export const normalizeOptionalScopeQuery = (scope) => {
  const normalizedScope = String(scope ?? '').trim();

  if (!normalizedScope || normalizedScope === 'active') {
    return undefined;
  }

  return normalizedScope;
};
