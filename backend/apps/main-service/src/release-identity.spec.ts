import { getReleaseIdentity } from './release-identity';

describe('getReleaseIdentity', () => {
  it('prefers an explicit release version and sanitizes it', () => {
    expect(
      getReleaseIdentity({
        NODE_ENV: 'production',
        RELEASE_VERSION: 'release/2026.08.11',
        RAILWAY_GIT_COMMIT_SHA: 'commit-fallback',
      }),
    ).toBe('release2026.08.11');
  });

  it('uses a deployment commit when no release version is supplied', () => {
    expect(
      getReleaseIdentity({
        NODE_ENV: 'production',
        RAILWAY_GIT_COMMIT_SHA: 'abc1234567890',
      }),
    ).toBe('abc1234567890');
  });

  it('never reports a development placeholder as a production release', () => {
    expect(
      getReleaseIdentity({ NODE_ENV: 'production', APP_VERSION: 'development' }),
    ).toBe('production-unknown');
  });

  it('keeps a useful local fallback', () => {
    expect(getReleaseIdentity({ NODE_ENV: 'development' })).toBe('development');
  });
});
