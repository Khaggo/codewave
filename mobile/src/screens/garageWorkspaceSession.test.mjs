import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGarageWorkspaceSessionState } from './garageWorkspaceSession.mjs'

test('Garage session reset keeps the list bounded and selects the owned route vehicle', () => {
  const account = {
    primaryVehicleId: 'vehicle-1',
    ownedVehicles: Array.from({ length: 191 }, (_, index) => ({
      id: `vehicle-${index + 1}`,
    })),
  }

  const state = buildGarageWorkspaceSessionState({
    account,
    pageSize: 3,
    routeVehicleId: 'vehicle-2',
  })

  assert.equal(state.vehicles.length, 3)
  assert.equal(state.page.total, 191)
  assert.equal(state.page.hasNext, true)
  assert.equal(state.selectedVehicleId, 'vehicle-2')
})
