import { requireSeedPassword } from './seed-credential-safety'

describe('seed credential safety', () => {
  it('requires an explicitly configured password', () => {
    expect(() => requireSeedPassword(undefined, 'QA_SEED_PASSWORD')).toThrow(
      'QA_SEED_PASSWORD is required',
    )
  })

  it.each(['Password1.', 'short-value', 'change-me'])(
    'rejects weak or placeholder passwords: %s',
    (password) => {
      expect(() => requireSeedPassword(password, 'QA_SEED_PASSWORD')).toThrow(
        'must contain at least 12 characters',
      )
    },
  )

  it('returns an explicitly configured non-placeholder password unchanged', () => {
    const password = 'Local-QA-Only-2026!'

    expect(requireSeedPassword(password, 'QA_SEED_PASSWORD')).toBe(password)
  })
})
