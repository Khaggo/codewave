const normalizeId = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return normalizedValue || null;
};

export const normalizeInsuranceOwnedVehicles = (vehicles) =>
  (Array.isArray(vehicles) ? vehicles : []).filter(
    (vehicle) => vehicle && normalizeId(vehicle.id),
  );

export const resolveInsuranceAccountVehicleSnapshot = ({
  currentOwnerKey,
  currentVehicles,
  hasSession,
  nextOwnerKey,
  nextVehicles,
}) => {
  const normalizedCurrentVehicles = normalizeInsuranceOwnedVehicles(currentVehicles);
  const normalizedNextVehicles = normalizeInsuranceOwnedVehicles(nextVehicles);
  const currentSnapshot =
    Array.isArray(currentVehicles) &&
    normalizedCurrentVehicles.length === currentVehicles.length
      ? currentVehicles
      : normalizedCurrentVehicles;
  const nextSnapshot =
    Array.isArray(nextVehicles) && normalizedNextVehicles.length === nextVehicles.length
      ? nextVehicles
      : normalizedNextVehicles;

  if (
    hasSession &&
    currentOwnerKey === nextOwnerKey &&
    normalizedCurrentVehicles.length > 0 &&
    normalizedNextVehicles.length === 0
  ) {
    return currentSnapshot;
  }

  return nextSnapshot;
};

const normalizeSearchValue = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase();

export const buildInsuranceVehicleSearchText = (vehicle) =>
  [
    vehicle?.displayName,
    vehicle?.plateNumber,
    vehicle?.publicReference,
    vehicle?.make,
    vehicle?.model,
    vehicle?.year,
  ]
    .map(normalizeSearchValue)
    .filter(Boolean)
    .join(' ');

export const filterInsuranceOwnedVehicles = (vehicles, query) => {
  const normalizedVehicles = normalizeInsuranceOwnedVehicles(vehicles);
  const searchTokens = normalizeSearchValue(query).split(/\s+/).filter(Boolean);

  if (!searchTokens.length) {
    return normalizedVehicles;
  }

  return normalizedVehicles.filter((vehicle) => {
    const searchText = buildInsuranceVehicleSearchText(vehicle);
    return searchTokens.every((token) => searchText.includes(token));
  });
};

export const resolveInsuranceVehicleSelection = ({
  currentVehicleId,
  ownedVehicles,
  primaryVehicleId,
  routeVehicleId,
}) => {
  const vehicles = normalizeInsuranceOwnedVehicles(ownedVehicles);
  const preferredIds = [
    normalizeId(routeVehicleId),
    normalizeId(currentVehicleId),
    normalizeId(primaryVehicleId),
  ].filter(Boolean);

  for (const preferredId of preferredIds) {
    const matchingVehicle = vehicles.find((vehicle) => vehicle.id === preferredId);

    if (matchingVehicle) {
      return matchingVehicle;
    }
  }

  return vehicles[0] ?? null;
};
