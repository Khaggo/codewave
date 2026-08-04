type GarageVehicleRecord = {
  id: string;
  userId: string;
  plateNumber: string;
  make: string;
  model: string;
  createdAt: Date;
};

export const findInMemoryGaragePage = <T extends GarageVehicleRecord>(
  vehicles: Iterable<T>,
  {
    userId,
    search,
    cursor,
    limit,
  }: {
    userId: string;
    search: string;
    cursor?: { createdAt: Date; id: string };
    limit: number;
  },
) => {
  const matchingVehicles = Array.from(vehicles)
    .filter((vehicle) => {
      if (vehicle.userId !== userId) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [vehicle.plateNumber, vehicle.make, vehicle.model].some((value) =>
        value.toLowerCase().includes(search),
      );
    })
    .sort((left, right) => {
      const createdAtDifference =
        right.createdAt.getTime() - left.createdAt.getTime();
      return createdAtDifference || right.id.localeCompare(left.id);
    });
  const pageItems = cursor
    ? matchingVehicles.filter((vehicle) => {
        const createdAtDifference =
          vehicle.createdAt.getTime() - cursor.createdAt.getTime();
        return (
          createdAtDifference < 0 ||
          (createdAtDifference === 0 && vehicle.id < cursor.id)
        );
      })
    : matchingVehicles;

  return {
    items: pageItems.slice(0, limit),
    total: matchingVehicles.length,
    hasNext: pageItems.length > limit,
  };
};
