import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getRewardCatalogPage,
  REWARD_CATALOG_PAGE_SIZE,
} from './rewardCatalogListModel.mjs'

function buildRewards(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `reward-${index + 1}`,
    name: `Reward ${index + 1}`,
    description: index === 8 ? 'Free wheel alignment' : 'Service discount',
    pointsRequired: (index + 1) * 100,
  }))
}

test('reward catalog keeps large result sets bounded', () => {
  const firstPage = getRewardCatalogPage({ rewards: buildRewards(50) })
  const lastPage = getRewardCatalogPage({ rewards: buildRewards(50), page: 99 })

  assert.equal(firstPage.items.length, REWARD_CATALOG_PAGE_SIZE)
  assert.equal(firstPage.firstVisibleNumber, 1)
  assert.equal(firstPage.lastVisibleNumber, REWARD_CATALOG_PAGE_SIZE)
  assert.equal(firstPage.totalMatches, 50)
  assert.equal(firstPage.canGoNext, true)

  assert.equal(lastPage.currentPage, 8)
  assert.equal(lastPage.items.length, 2)
  assert.equal(lastPage.lastVisibleNumber, 50)
  assert.equal(lastPage.canGoNext, false)
})

test('reward catalog search matches names, descriptions, and points', () => {
  const rewards = buildRewards(12)

  assert.deepEqual(
    getRewardCatalogPage({ rewards, query: 'wheel alignment' }).items.map(
      (item) => item.id,
    ),
    ['reward-9'],
  )
  assert.deepEqual(
    getRewardCatalogPage({ rewards, query: '1200' }).items.map(
      (item) => item.id,
    ),
    ['reward-12'],
  )
})
