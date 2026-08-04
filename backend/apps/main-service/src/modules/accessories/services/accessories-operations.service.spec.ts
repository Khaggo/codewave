import { AccessoriesOperationsService } from './accessories-operations.service';

describe('AccessoriesOperationsService', () => {
  it('releases reservations and dispatches each durable event once', async () => {
    const repository = {
      releaseExpiredReservations: jest.fn().mockResolvedValue(1),
      claimOutboxBatch: jest.fn().mockResolvedValue([
        {
          id: 'outbox-1',
          eventType: 'accessory.order.ready_for_pickup',
          aggregateId: 'order-1',
          payload: { userId: 'user-1', orderReference: 'ACC-1' },
        },
      ]),
      markOutboxSent: jest.fn().mockResolvedValue(undefined),
      markOutboxFailed: jest.fn().mockResolvedValue(undefined),
    };
    const notifications = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue(null),
      createNotification: jest.fn().mockResolvedValue({ id: 'notification-1' }),
    };
    const service = new AccessoriesOperationsService(
      { get: jest.fn().mockReturnValue('test') } as never,
      repository as never,
      notifications as never,
    );

    await service.tick();

    expect(notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        category: 'accessory_order',
        sourceType: 'accessory_order',
        dedupeKey: 'accessory-outbox:outbox-1',
      }),
    );
    expect(repository.markOutboxSent).toHaveBeenCalledWith('outbox-1');
    expect(repository.markOutboxFailed).not.toHaveBeenCalled();
  });

  it('does not create a second notification after an outbox retry', async () => {
    const repository = {
      releaseExpiredReservations: jest.fn().mockResolvedValue(0),
      claimOutboxBatch: jest.fn().mockResolvedValue([
        { id: 'outbox-1', eventType: 'accessory.order.created', aggregateId: 'order-1', payload: { userId: 'user-1' } },
      ]),
      markOutboxSent: jest.fn(),
      markOutboxFailed: jest.fn(),
    };
    const notifications = {
      findNotificationByDedupeKey: jest.fn().mockResolvedValue({ id: 'existing' }),
      createNotification: jest.fn(),
    };
    const service = new AccessoriesOperationsService({ get: jest.fn() } as never, repository as never, notifications as never);

    await service.tick();

    expect(notifications.createNotification).not.toHaveBeenCalled();
    expect(repository.markOutboxSent).toHaveBeenCalledWith('outbox-1');
  });
});
