import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGarageWorkshopMetric,
  buildGarageWorkspacePageModel,
  createGarageWorkspaceInitialState,
  getGarageLoadErrorMessage,
  getNextGaragePageRequest,
  getPreviousGaragePageRequest,
  mergeGarageTimelinePage,
  normalizeGarageWorkspacePage,
  resolveGarageWorkspaceVehicleId,
} from './garageWorkspaceModel.mjs'

const vehicles = [
  { id: 'vehicle-first' },
  { id: 'vehicle-current' },
  { id: 'vehicle-primary' },
  { id: 'vehicle-route' },
]

test('Garage workshop metric hides stale stages after terminal work', () => {
  assert.deepEqual(
    buildGarageWorkshopMetric({
      status: 'finalized',
      workshopStage: 'in_repair',
    }),
    {
      helper: 'Service complete',
      value: 'finalized',
    },
  )
  assert.deepEqual(buildGarageWorkshopMetric(null), {
    helper: 'No active work',
    value: 'None',
  })
})

test('Garage workspace gives an explicit owned route vehicle highest priority', () => {
  assert.equal(
    resolveGarageWorkspaceVehicleId({
      routeVehicleId: 'vehicle-route',
      currentVehicleId: 'vehicle-current',
      primaryVehicleId: 'vehicle-primary',
      vehicles,
    }),
    'vehicle-route',
  )
})

test('Garage workspace preserves the current owned vehicle during refresh', () => {
  assert.equal(
    resolveGarageWorkspaceVehicleId({
      routeVehicleId: 'not-owned',
      currentVehicleId: 'vehicle-current',
      primaryVehicleId: 'vehicle-primary',
      vehicles,
    }),
    'vehicle-current',
  )
})

test('Garage workspace falls back through primary, first, and route-only startup', () => {
  assert.equal(
    resolveGarageWorkspaceVehicleId({
      currentVehicleId: 'not-owned',
      primaryVehicleId: 'vehicle-primary',
      vehicles,
    }),
    'vehicle-primary',
  )
  assert.equal(
    resolveGarageWorkspaceVehicleId({
      vehicles,
    }),
    'vehicle-first',
  )
  assert.equal(
    resolveGarageWorkspaceVehicleId({
      routeVehicleId: 'vehicle-route-only',
      vehicles: [],
      allowUnknownRoute: true,
    }),
    'vehicle-route-only',
  )
})

test('Garage workspace derives bounded server-page ordinals without loading every vehicle', () => {
  assert.deepEqual(
    buildGarageWorkspacePageModel({
      page: {
        currentPage: 2,
        limit: 3,
        total: 132,
      },
      vehicles: vehicles.slice(0, 3),
    }),
    {
      currentPage: 2,
      firstVisibleNumber: 7,
      lastVisibleNumber: 9,
      totalPages: 44,
      totalVehicles: 132,
      visibleVehicles: vehicles.slice(0, 3),
    },
  )
})

test('Garage workspace initialization bounds vehicles and preserves route selection', () => {
  assert.deepEqual(
    createGarageWorkspaceInitialState({
      account: {
        ownedVehicles: vehicles,
        primaryVehicleId: 'vehicle-primary',
      },
      routeVehicleId: 'vehicle-route',
      pageSize: 3,
    }),
    {
      selectedVehicleId: 'vehicle-route',
      vehicles: vehicles.slice(0, 3),
      page: {
        currentPage: 0,
        limit: 3,
        total: 4,
        hasNext: true,
        nextCursor: null,
      },
    },
  )
})

test('Garage workspace normalizes server pages and readable load errors', () => {
  assert.deepEqual(normalizeGarageWorkspacePage({ limit: 0, total: -3 }, 5), {
    currentPage: 0,
    limit: 5,
    total: 0,
    hasNext: false,
    nextCursor: null,
  })
  assert.equal(
    getGarageLoadErrorMessage(new Error('Garage unavailable'), 'Try again.'),
    'Garage unavailable',
  )
  assert.equal(getGarageLoadErrorMessage(null, 'Try again.'), 'Try again.')
})

test('Garage workspace derives cursor requests without mutating controller state', () => {
  assert.deepEqual(
    getPreviousGaragePageRequest({ currentPage: 2 }, [null, 'cursor-2']),
    { cursor: 'cursor-2', pageIndex: 1, preferredVehicleId: null },
  )
  assert.deepEqual(
    getNextGaragePageRequest({
      currentPage: 2,
      hasNext: true,
      nextCursor: 'cursor-4',
    }),
    { cursor: 'cursor-4', pageIndex: 3, preferredVehicleId: null },
  )
  assert.equal(getPreviousGaragePageRequest({ currentPage: 0 }), null)
  assert.equal(getNextGaragePageRequest({ hasNext: false }), null)
})

test('Garage workspace merges timeline pages by event id and recomputes stats', () => {
  assert.deepEqual(
    mergeGarageTimelinePage({
      snapshot: {
        events: [{ id: 'event-1', statusTone: 'verified' }],
        page: { nextCursor: 'old' },
      },
      nextEvents: [
        { id: 'event-1', statusTone: 'verified' },
        { id: 'event-2', statusTone: 'pending' },
      ],
      page: { nextCursor: null },
    }),
    {
      events: [
        { id: 'event-1', statusTone: 'verified' },
        { id: 'event-2', statusTone: 'pending' },
      ],
      timelineState: 'timeline_ready',
      stats: {
        totalEvents: 2,
        verifiedEvents: 1,
        administrativeEvents: 1,
      },
      page: { nextCursor: null },
    },
  )
})
