import test from 'node:test'
import assert from 'node:assert/strict'

import { buildModalForm, getCatalogImageCount, parseImageUrls } from './shopProductAdminView.mjs'

test('parseImageUrls trims blanks and keeps one url per line', () => {
  assert.deepEqual(parseImageUrls('\n https://a.test/1.jpg \n\nhttps://b.test/2.jpg  '), [
    'https://a.test/1.jpg',
    'https://b.test/2.jpg',
  ])
})

test('buildModalForm normalizes editable product fields', () => {
  assert.deepEqual(
    buildModalForm({
      id: 'prod-1',
      name: 'Seat Cover',
      category: 'Accessories',
      price: 1200,
      sku: 'SC-01',
      description: 'Front seat cover',
      images: ['https://a.test/1.jpg'],
    }),
    {
      id: 'prod-1',
      name: 'Seat Cover',
      category: 'Accessories',
      price: '1200',
      sku: 'SC-01',
      description: 'Front seat cover',
      imageInput: '',
      images: ['https://a.test/1.jpg'],
    },
  )
})

test('getCatalogImageCount sums attached product images', () => {
  assert.equal(
    getCatalogImageCount([
      { id: 'prod-1', images: ['a', 'b'] },
      { id: 'prod-2', images: ['c'] },
      { id: 'prod-3', images: [] },
    ]),
    3,
  )
})
