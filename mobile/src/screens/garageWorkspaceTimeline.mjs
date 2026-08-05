import {
  buildCustomerTimelineEventPresentation,
  listCustomerVehicleTimelinePage,
} from '../lib/vehicleLifecycleClient';
import { getGarageLoadErrorMessage, mergeGarageTimelinePage } from './garageWorkspaceModel.mjs';

export const loadMoreGarageTimelinePage = async ({
  accessToken,
  accountUserId,
  activeSourceType,
  coordinator,
  currentSnapshot,
  currentVehicleId,
  isLoadingMore,
  onError,
  onFinish,
  onStart,
  onSuccess,
}) => {
  if (
    !currentVehicleId ||
    !currentSnapshot?.page?.hasNext ||
    !currentSnapshot.page.nextCursor ||
    isLoadingMore
  ) {
    return false;
  }

  onStart();
  const token = coordinator.begin(
    `${accountUserId ?? 'customer'}:${currentVehicleId}:${
      activeSourceType ?? 'all'
    }:${currentSnapshot.page.nextCursor}`,
  );

  try {
    const nextPage = await listCustomerVehicleTimelinePage({
      vehicleId: currentVehicleId,
      cursor: currentSnapshot.page.nextCursor,
      sourceType: activeSourceType,
      limit: 20,
      accessToken,
    });
    if (!coordinator.isCurrent(token)) {
      return false;
    }

    onSuccess({
      nextEvents: nextPage.items.map(buildCustomerTimelineEventPresentation),
      page: nextPage.page,
    });
    return true;
  } catch (error) {
    if (!coordinator.isCurrent(token)) {
      return false;
    }

    onError(
      getGarageLoadErrorMessage(
        error,
        'We could not load more Garage updates.',
      ),
    );
    return false;
  } finally {
    if (coordinator.isCurrent(token)) {
      onFinish();
    }
  }
};

export const mergeGarageTimelineSuccess = ({ snapshot, nextEvents, page }) =>
  mergeGarageTimelinePage({ snapshot, nextEvents, page });
