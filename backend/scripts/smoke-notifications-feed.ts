import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { Pool } from 'pg';

type JsonObject = Record<string, unknown>;
type FeedNotification = {
  category: string;
  sourceId: string;
  status: string;
  attempts?: Array<{ status: string; errorMessage?: string | null }>;
};

const backendRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] ??= value;
  }
}

loadEnvFile(path.join(backendRoot, '.env.example'));
loadEnvFile(path.join(backendRoot, '.env'));

const apiBaseUrl = (process.env.SMOKE_API_BASE_URL ?? 'http://127.0.0.1:3000/api').replace(/\/$/, '');
const smokePassword = process.env.SMOKE_STAFF_PASSWORD ?? 'SuperPassword67.';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed notification smoke-test accounts.');
}

const pool = new Pool({ connectionString: databaseUrl });
const smokeRunId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function requestJson<T = JsonObject>(
  routePath: string,
  options: {
    method?: string;
    token?: string;
    body?: JsonObject;
  } = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${routePath}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(`${options.method ?? (options.body ? 'POST' : 'GET')} ${routePath} -> ${response.status}: ${responseText}`);
  }

  return responseBody as T;
}

async function upsertAuthUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'service_adviser';
  staffCode?: string | null;
}) {
  const passwordHash = await bcrypt.hash(smokePassword, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query<{ id: string; email: string; staff_code: string | null }>(
      `
        INSERT INTO users (email, role, staff_code, is_active, deleted_email, deleted_at)
        VALUES ($1, $2, $3, true, null, null)
        ON CONFLICT (email)
        DO UPDATE SET
          role = EXCLUDED.role,
          staff_code = EXCLUDED.staff_code,
          is_active = true,
          deleted_email = null,
          deleted_at = null,
          updated_at = now()
        RETURNING id, email, staff_code
      `,
      [input.email, input.role, input.staffCode ?? null],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_profiles (user_id, first_name, last_name, phone)
        VALUES ($1, $2, $3, null)
        ON CONFLICT (user_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          updated_at = now()
      `,
      [user.id, input.firstName, input.lastName],
    );

    await client.query(
      `
        INSERT INTO auth_accounts (user_id, password_hash, is_active)
        VALUES ($1, $2, true)
        ON CONFLICT (user_id)
        DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          is_active = true,
          updated_at = now()
      `,
      [user.id, passwordHash],
    );

    await client.query('COMMIT');
    return {
      id: user.id,
      email: user.email,
      staffCode: user.staff_code,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function login(email: string) {
  return requestJson<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: {
      email,
      password: smokePassword,
    },
  });
}

function addDays(value: Date, days: number) {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateOnly(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

function assertFeedNotification(
  notifications: FeedNotification[],
  matcher: Pick<FeedNotification, 'category' | 'sourceId' | 'status'>,
) {
  const notification = notifications.find(
    (candidate) =>
      candidate.category === matcher.category &&
      candidate.sourceId === matcher.sourceId &&
      candidate.status === matcher.status,
  );

  if (!notification) {
    throw new Error(
      `Expected notification ${matcher.category}/${matcher.sourceId}/${matcher.status} was not returned in the customer feed.`,
    );
  }

  return notification;
}

async function main() {
  const adviser = await upsertAuthUser({
    email: 'smoke.adviser.t535@example.com',
    firstName: 'Smoke',
    lastName: 'Adviser',
    role: 'service_adviser',
    staffCode: 'SMOKE-T535-SA',
  });
  const customer = await upsertAuthUser({
    email: `smoke.customer.t535.${smokeRunId}@example.com`,
    firstName: 'Smoke',
    lastName: 'Notification',
    role: 'customer',
  });

  const [adviserSession, customerSession] = await Promise.all([
    login(adviser.email),
    login(customer.email),
  ]);

  const [services, timeSlots] = await Promise.all([
    requestJson<Array<{ id: string; name: string; isActive?: boolean }>>('/services'),
    requestJson<Array<{ id: string; label: string; isActive?: boolean }>>('/time-slots'),
  ]);
  const activeService = services.find((service) => service.isActive !== false);
  const activeTimeSlot = timeSlots.find((timeSlot) => timeSlot.isActive !== false);
  const fallbackTimeSlot = timeSlots.find((timeSlot) => timeSlot.id !== activeTimeSlot?.id && timeSlot.isActive !== false);

  if (!activeService || !activeTimeSlot) {
    throw new Error('Notification smoke requires at least one active service and one active time slot.');
  }

  const vehicle = await requestJson<{ id: string }>('/vehicles', {
    method: 'POST',
    body: {
      userId: customer.id,
      plateNumber: `N535${smokeRunId.slice(-4)}`,
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
    },
  });

  await requestJson(`/users/${customer.id}/notification-preferences`, {
    method: 'PATCH',
    token: customerSession.accessToken,
    body: {
      bookingRemindersEnabled: false,
    },
  });

  const booking = await requestJson<{ id: string }>('/bookings', {
    method: 'POST',
    body: {
      userId: customer.id,
      vehicleId: vehicle.id,
      timeSlotId: activeTimeSlot.id,
      scheduledDate: formatDateOnly(addDays(new Date(), 14)),
      serviceIds: [activeService.id],
      notes: 'T535 notification smoke booking.',
    },
  });

  await requestJson(`/bookings/${booking.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: {
      status: 'confirmed',
      reason: 'T535 smoke validates preference-skipped reminder state.',
    },
  });

  const skippedFeed = await requestJson<FeedNotification[]>(`/users/${customer.id}/notifications`, {
    token: customerSession.accessToken,
  });
  const skippedBookingReminder = assertFeedNotification(skippedFeed, {
    category: 'booking_reminder',
    sourceId: booking.id,
    status: 'skipped',
  });
  const skippedAttempt = skippedBookingReminder.attempts?.find((attempt) => attempt.status === 'skipped');
  if (!skippedAttempt) {
    throw new Error('Expected skipped booking reminder to include an auditable skipped delivery attempt.');
  }

  await requestJson(`/users/${customer.id}/notification-preferences`, {
    method: 'PATCH',
    token: customerSession.accessToken,
    body: {
      bookingRemindersEnabled: true,
    },
  });

  await requestJson(`/bookings/${booking.id}/reschedule`, {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      timeSlotId: fallbackTimeSlot?.id ?? activeTimeSlot.id,
      scheduledDate: formatDateOnly(addDays(new Date(), 15)),
      reason: 'T535 smoke validates future preference-enabled reminder planning.',
    },
  });

  const inquiry = await requestJson<{ id: string }>('/insurance/inquiries', {
    method: 'POST',
    token: customerSession.accessToken,
    body: {
      userId: customer.id,
      vehicleId: vehicle.id,
      inquiryType: 'comprehensive',
      subject: 'T535 notification smoke inquiry',
      description: 'Insurance status change should create a customer feed notification.',
    },
  });

  await requestJson(`/insurance/inquiries/${inquiry.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: {
      status: 'under_review',
      reviewNotes: 'T535 smoke validates insurance notification planning.',
    },
  });

  const liveFeed = await requestJson<FeedNotification[]>(`/users/${customer.id}/notifications`, {
    token: customerSession.accessToken,
  });
  assertFeedNotification(liveFeed, {
    category: 'booking_reminder',
    sourceId: booking.id,
    status: 'queued',
  });
  assertFeedNotification(liveFeed, {
    category: 'insurance_update',
    sourceId: inquiry.id,
    status: 'queued',
  });

  console.log(JSON.stringify({
    status: 'ok',
    apiBaseUrl,
    customerId: customer.id,
    bookingId: booking.id,
    inquiryId: inquiry.id,
    skippedAttemptStatus: skippedAttempt.status,
    feedCount: liveFeed.length,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
