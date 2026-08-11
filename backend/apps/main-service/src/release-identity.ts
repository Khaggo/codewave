type ReleaseEnvironment = Readonly<Record<string, string | undefined>>;

const RELEASE_ENVIRONMENT_KEYS = [
  'RELEASE_VERSION',
  'RAILWAY_GIT_COMMIT_SHA',
  'GIT_COMMIT_SHA',
  'COMMIT_SHA',
  'APP_VERSION',
] as const;

const PRODUCTION_PLACEHOLDERS = new Set([
  'development',
  'dev',
  'local',
  'test',
  'unknown',
]);

const sanitizeReleaseIdentity = (candidate: string): string =>
  candidate.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64);

export const getReleaseIdentity = (
  environment: ReleaseEnvironment = process.env,
): string => {
  const isProduction = environment.NODE_ENV?.trim().toLowerCase() === 'production';

  for (const key of RELEASE_ENVIRONMENT_KEYS) {
    const candidate = environment[key]?.trim();
    if (!candidate) {
      continue;
    }

    if (isProduction && PRODUCTION_PLACEHOLDERS.has(candidate.toLowerCase())) {
      continue;
    }

    const sanitizedCandidate = sanitizeReleaseIdentity(candidate);
    if (sanitizedCandidate) {
      return sanitizedCandidate;
    }
  }

  return isProduction ? 'production-unknown' : 'development';
};
