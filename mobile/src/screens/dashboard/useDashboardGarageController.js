import { useCallback, useMemo, useState } from 'react'

import { buildDigitalGarageSnapshot } from '../../lib/digitalGarageModel.mjs'
import useGarageWorkspaceController from '../useGarageWorkspaceController'

const mapGarageStatus = (status, hasSession) => {
  if (!hasSession) return 'garage_unauthorized'
  if (status === 'error') return 'garage_failed'
  if (status === 'search_empty' || status === 'empty') return 'garage_empty'
  if (status === 'ready') return 'garage_ready'
  return 'garage_loading'
}

const buildLegacyGarageState = ({ controller, account }) => {
  const page = controller.garagePage ?? {
    currentPage: controller.garagePageModel?.currentPage ?? 0,
    limit: controller.garagePageModel?.visibleVehicles?.length || 3,
    total: controller.garagePageModel?.totalVehicles ?? 0,
    hasNext: Boolean(controller.canGoNext),
    nextCursor: null,
  }
  const snapshot = buildDigitalGarageSnapshot({
    vehicles: controller.vehicles,
    preferredVehicleId: controller.selectedVehicleId ?? account?.primaryVehicleId,
    ordinalOffset: page.currentPage * page.limit,
    page,
  })

  return {
    ...snapshot,
    status: mapGarageStatus(controller.status, Boolean(account?.accessToken)),
    errorMessage: controller.errorMessage ?? '',
  }
}

export default function useDashboardGarageController({
  account,
  garageActive,
  lifecycleActive,
  onSelectedVehicleChange,
  refreshSignal,
}) {
  const controller = useGarageWorkspaceController({
    account,
    enabled: Boolean(garageActive || lifecycleActive),
    onSelectedVehicleChange,
    refreshSignal,
  })
  const [timelineFilter, setTimelineFilterState] = useState(null)

  const garageState = useMemo(
    () => buildLegacyGarageState({ controller, account }),
    [account, controller],
  )
  const lifecycleState = useMemo(
    () => ({
      entityId: controller.selectedVehicleId ?? null,
      status:
        controller.status === 'ready'
          ? controller.snapshot?.timelineState ?? 'timeline_empty'
          : controller.status === 'loading'
            ? 'timeline_loading'
            : controller.status === 'error'
              ? 'timeline_load_failed'
              : 'timeline_empty',
      errorMessage: controller.errorMessage ?? '',
      ...controller.snapshot,
    }),
    [controller],
  )
  const selectedVehicleSummary =
    garageState.vehicleSummaries.find(
      (vehicle) => vehicle.id === controller.selectedVehicleId,
    ) ?? null

  const refreshGarage = useCallback(
    () => controller.loadLifecycle({ cursor: null, pageIndex: 0 }),
    [controller.loadLifecycle],
  )
  const refreshAll = useCallback(async () => {
    setTimelineFilterState(null)
    return controller.loadLifecycle({ cursor: null, pageIndex: 0 })
  }, [controller.loadLifecycle])
  const setTimelineFilter = useCallback(
    (sourceType) => {
      setTimelineFilterState(sourceType ?? null)
      return controller.changeSource(sourceType)
    },
    [controller.changeSource],
  )

  return {
    garageState,
    lifecycleState,
    nextGaragePage: controller.nextVehiclePage,
    previousGaragePage: controller.previousVehiclePage,
    refreshAll,
    refreshGarage,
    selectVehicle: controller.selectVehicle,
    selectedVehicle: controller.selectedVehicle,
    selectedVehicleId: controller.selectedVehicleId,
    selectedVehicleSummary,
    setTimelineFilter,
    timelineFilter,
    vehicleSummaries: garageState.vehicleSummaries,
    workspaceController: controller,
  }
}
