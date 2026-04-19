'use client'

import { useSyncExternalStore } from 'react'
import {
  getAppointmentsSnapshot,
  getCatalogCategoriesSnapshot,
  getInventoryProductsSnapshot,
  getOperationsActivitySnapshot,
  getPublishedCatalogProductsSnapshot,
  subscribeOperations,
} from '@autocare/shared'

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
const getCachedPublishedCatalogProductsSnapshot = createCachedSnapshot(getPublishedCatalogProductsSnapshot)
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
