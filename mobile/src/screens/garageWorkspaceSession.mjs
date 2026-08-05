import {
  normalizeGarageWorkspacePage,
  resolveGarageWorkspaceVehicleId,
} from './garageWorkspaceModel.mjs'

export const buildGarageWorkspaceSessionState = ({
  account,
  pageSize,
  routeVehicleId,
}) => {
  const ownedVehicles = Array.isArray(account?.ownedVehicles)
    ? account.ownedVehicles
    : []
  const vehicles = ownedVehicles.slice(0, pageSize)

  return {
    vehicles,
    page: normalizeGarageWorkspacePage(
      {
        currentPage: 0,
        limit: pageSize,
        total: ownedVehicles.length,
        hasNext: ownedVehicles.length > pageSize,
        nextCursor: null,
      },
      pageSize,
    ),
    selectedVehicleId: resolveGarageWorkspaceVehicleId({
      routeVehicleId,
      currentVehicleId: null,
      primaryVehicleId: account?.primaryVehicleId,
      vehicles: ownedVehicles,
      allowUnknownRoute: true,
    }),
  }
}
