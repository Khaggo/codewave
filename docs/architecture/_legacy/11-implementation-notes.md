# Implementation Notes

This document carries practical coding guidance and reference snippets.

## How to Apply the Architecture Recommendation

- Organize by domain first.
- Keep controllers thin.
- Keep services responsible for orchestration and business rules.
- Keep repositories focused on persistence access.
- Use shared base helpers only for generic persistence mechanics.
- Keep lifecycle verification, inspection logic, back-job rules, and invoice payment rules inside domain-specific layers.

## Recommended Domain Layout

```text
src/
  modules/
    auth/
    users/
    vehicles/
    bookings/
    vehicle-lifecycle/
    inspections/
    insurance/
    loyalty/
    back-jobs/
    job-monitoring/
    chatbot/
    analytics/
    ecommerce-gateway/
  shared/
    db/
    base/
    events/
    queue/
```

## Context7-Backed Snippets

### NestJS Microservice Pattern

```ts
const app = await NestFactory.create(AppModule);

app.connectMicroservice({
  transport: Transport.TCP,
  options: { port: 3001 },
});

await app.startAllMicroservices();
await app.listen(3000);

@EventPattern('order_completed')
handleOrderCompleted(payload: OrderCompletedEvent) {
  return this.loyaltyService.awardFromOrder(payload);
}
```

### BullMQ Reminder Queue

```ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: process.env.REDIS_HOST, port: 6379 },
    }),
    BullModule.registerQueue({ name: 'notifications' }),
  ],
})
export class QueueModule {}

@Injectable()
export class ReminderService {
  constructor(@InjectQueue('notifications') private queue: Queue) {}

  scheduleBookingReminder(data: ReminderPayload) {
    return this.queue.add('booking-reminder', data, {
      delay: data.delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
```

### BullMQ Worker

```ts
@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  async process(job: Job<NotificationJob>) {
    switch (job.name) {
      case 'booking-reminder':
        return this.notificationGateway.send(job.data);
      case 'insurance-renewal':
        return this.notificationGateway.send(job.data);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
```

### Drizzle ORM Schema Style

```ts
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id),
  timeSlotId: integer('time_slot_id').references(() => timeSlots.id),
  status: varchar('status', { length: 40 }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const bookingStatusHistory = pgTable('booking_status_history', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id),
  status: varchar('status', { length: 40 }).notNull(),
  changedBy: integer('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Event Contract Example

```ts
type OrderCompletedEvent = {
  event: 'order.completed';
  orderId: string;
  customerId: string;
  totalAmount: number;
  rewardableAmount: number;
  orderedAt: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
};
```

## Coding Guidance

- Prefer explicit domain names over generic naming.
- Keep status enums close to the domain that owns them.
- Make verified lifecycle events traceable back to inspection records.
- Model back-job linkage clearly from the first schema draft.
- Keep invoice payment status tracking separate from true financial settlement assumptions.
