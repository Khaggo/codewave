'use client'

import { useSyncExternalStore } from 'react'
import {
  getAppointmentsSnapshot,
  getCatalogCategoriesSnapshot,
  getInventoryAdjustmentHistorySnapshot,
  getInventoryProductsSnapshot,
  getLowStockProducts,
  getOperationsActivitySnapshot,
  getPublishedCatalogProductsSnapshot,
  subscribeOperations,
} from '../shared/autocare/services/operationsStore.js'

function createCachedSnapshot(getSnapshot) {
  let cachedSerialized = null
  let cachedValue = null

  return function getCachedSnapshot() {
    const nextValue = getSnapshot()
    const nextSerialized = JSON.stringify(nextValue)

    if (nextSerialized !== cachedSerialized) {
      cachedSerialized = nextSerialized
      cachedValue = nextValue
    }

    return cachedValue
  }
}

const getCachedInventoryProductsSnapshot = createCachedSnapshot(getInventoryProductsSnapshot)
const getCachedAppointmentsSnapshot = createCachedSnapshot(getAppointmentsSnapshot)
const getCachedCatalogCategoriesSnapshot = createCachedSnapshot(getCatalogCategoriesSnapshot)
const getCachedInventoryAdjustmentHistorySnapshot = createCachedSnapshot(() =>
  getInventoryAdjustmentHistorySnapshot()
)
const getCachedPublishedCatalogProductsSnapshot = createCachedSnapshot(getPublishedCatalogProductsSnapshot)
const getCachedLowStockProductsSnapshot = createCachedSnapshot(() => getLowStockProducts())
const getCachedOperationsActivitySnapshot = createCachedSnapshot(getOperationsActivitySnapshot)

export function useInventoryProducts() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedInventoryProductsSnapshot,
    getCachedInventoryProductsSnapshot
  )
}

export function useAppointmentsStore() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedAppointmentsSnapshot,
    getCachedAppointmentsSnapshot
  )
}

export function useCatalogCategories() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedCatalogCategoriesSnapshot,
    getCachedCatalogCategoriesSnapshot
  )
}

export function useInventoryProduct(productId) {
  const products = useInventoryProducts()
  return products.find((product) => product.id === productId) ?? null
}

export function useInventoryAdjustmentHistory(productId = null) {
  const history = useSyncExternalStore(
    subscribeOperations,
    getCachedInventoryAdjustmentHistorySnapshot,
    getCachedInventoryAdjustmentHistorySnapshot
  )

  if (!productId) {
    return history
  }

  return history.filter((record) => record.productId === productId)
}

export function useLowStockProducts() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedLowStockProductsSnapshot,
    getCachedLowStockProductsSnapshot
  )
}

export function usePublishedCatalogProducts() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedPublishedCatalogProductsSnapshot,
    getCachedPublishedCatalogProductsSnapshot
  )
}

export function useOperationsActivity() {
  return useSyncExternalStore(
    subscribeOperations,
    getCachedOperationsActivitySnapshot,
    getCachedOperationsActivitySnapshot
  )
}
