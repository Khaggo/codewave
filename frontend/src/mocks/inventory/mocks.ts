import {
  buildStaffInventoryCategoryPresentation,
  buildStaffInventoryProductPresentation,
  staffInventoryStateScenarios,
} from '../../lib/api/generated/inventory/staff-web-inventory';
import {
  catalogCategoriesMock,
  catalogProductsMock,
} from '../catalog/mocks';

export const inventoryCategoryPresentationMocks = catalogCategoriesMock.map(
  buildStaffInventoryCategoryPresentation,
);

export const inventoryProductPresentationMocks = catalogProductsMock.map(
  buildStaffInventoryProductPresentation,
);

export const inventoryLiveVisibilityMock = {
  categories: inventoryCategoryPresentationMocks,
  products: inventoryProductPresentationMocks,
};

export const inventoryPlannedStateGlossaryMock = staffInventoryStateScenarios;

export const inventoryServiceUnavailableMock = {
  categories: [],
  products: [],
  errorMessage: 'Ecommerce-service is not reachable on port 3001.',
};
