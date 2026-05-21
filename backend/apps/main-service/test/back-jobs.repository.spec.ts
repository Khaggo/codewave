import {
  createUpdatedAtMatchFilters,
  matchesUpdatedAtWithinMillisecond,
} from '@main-modules/back-jobs/repositories/back-jobs.repository';

describe('BackJobsRepository optimistic concurrency helpers', () => {
  it('builds a millisecond-safe updatedAt filter range', () => {
    const filters = createUpdatedAtMatchFilters('2026-05-21T07:15:33.123Z');

    expect(filters).toHaveLength(2);
  });

  it('matches updatedAt values within the same serialized millisecond', () => {
    expect(matchesUpdatedAtWithinMillisecond(new Date('2026-05-21T07:15:33.123Z'), '2026-05-21T07:15:33.123Z')).toBe(
      true,
    );
    expect(matchesUpdatedAtWithinMillisecond(new Date('2026-05-21T07:15:33.124Z'), '2026-05-21T07:15:33.123Z')).toBe(
      false,
    );
    expect(matchesUpdatedAtWithinMillisecond(new Date('2026-05-21T07:15:33.123Z'))).toBe(true);
  });
});
