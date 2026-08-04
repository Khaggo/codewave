export const REWARD_CATALOG_PAGE_SIZE = 6

function normalizeSearchValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function buildRewardSearchText(reward) {
  return [
    reward?.name,
    reward?.title,
    reward?.description,
    reward?.pointsRequired,
    reward?.points,
  ]
    .map(normalizeSearchValue)
    .filter(Boolean)
    .join(' ')
}

export function filterRewardCatalog(rewards, query = '') {
  const safeRewards = Array.isArray(rewards) ? rewards.filter(Boolean) : []
  const normalizedQuery = normalizeSearchValue(query)
  if (!normalizedQuery) return safeRewards

  const terms = normalizedQuery.split(/\s+/).filter(Boolean)
  return safeRewards.filter((reward) => {
    const searchText = buildRewardSearchText(reward)
    return terms.every((term) => searchText.includes(term))
  })
}

export function getRewardCatalogPage({
  rewards,
  query = '',
  page = 0,
  pageSize = REWARD_CATALOG_PAGE_SIZE,
} = {}) {
  const filteredRewards = filterRewardCatalog(rewards, query)
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0
    ? pageSize
    : REWARD_CATALOG_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(filteredRewards.length / safePageSize))
  const requestedPage = Number.isInteger(page) && page >= 0 ? page : 0
  const currentPage = Math.min(requestedPage, pageCount - 1)
  const startIndex = currentPage * safePageSize
  const items = filteredRewards.slice(startIndex, startIndex + safePageSize)

  return {
    items,
    currentPage,
    pageCount,
    totalMatches: filteredRewards.length,
    firstVisibleNumber: items.length ? startIndex + 1 : 0,
    lastVisibleNumber: startIndex + items.length,
    canGoPrevious: currentPage > 0,
    canGoNext: currentPage < pageCount - 1,
  }
}
