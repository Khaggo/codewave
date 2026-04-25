import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { Pool } from 'pg';

type StaffRole = 'technician' | 'service_adviser' | 'super_admin';
type JsonObject = Record<string, unknown>;

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
const staffPassword = process.env.SMOKE_STAFF_PASSWORD ?? 'SuperPassword67.';
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed smoke-test staff accounts.');
}

const pool = new Pool({ connectionString: databaseUrl });

const smokeRunId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const smokeStaff = {
  adviser: {
    email: 'smoke.adviser.t532@example.com',
    firstName: 'Smoke',
    lastName: 'Adviser',
    role: 'service_adviser' as const,
    staffCode: 'SMOKE-T532-SA',
  },
  technician: {
    email: 'smoke.technician.t532@example.com',
    firstName: 'Smoke',
    lastName: 'Technician',
    role: 'technician' as const,
    staffCode: 'SMOKE-T532-TECH',
  },
  superAdmin: {
    email: 'smoke.superadmin.t532@example.com',
    firstName: 'Smoke',
    lastName: 'Super Admin',
    role: 'super_admin' as const,
    staffCode: 'SMOKE-T532-SUPER',
  },
};

async function requestJson<T = JsonObject>(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: JsonObject;
  } = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
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
    throw new Error(`${options.method ?? (options.body ? 'POST' : 'GET')} ${path} -> ${response.status}: ${responseText}`);
  }

  return responseBody as T;
}

async function upsertStaffAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  staffCode: string;
}) {
  const passwordHash = await bcrypt.hash(staffPassword, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query<{ id: string; email: string; staff_code: string }>(
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
      [input.email, input.role, input.staffCode],
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
  return requestJson<{ accessToken: string; user: { id: string; staffCode: string } }>('/auth/login', {
    method: 'POST',
    body: {
      email,
      password: staffPassword,
    },
  });
}

async function waitForTerminalQa(jobOrderId: string, token: string) {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const qualityGate = await requestJson<{ status: string; blockingReason?: string | null }>(
      `/job-orders/${jobOrderId}/qa`,
      { token },
    );

    if (['passed', 'blocked', 'overridden'].includes(qualityGate.status)) {
      return qualityGate;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Quality gate for ${jobOrderId} did not reach a terminal state within the smoke timeout.`);
}

async function main() {
  const [adviser, technician, superAdmin] = await Promise.all([
    upsertStaffAccount(smokeStaff.adviser),
    upsertStaffAccount(smokeStaff.technician),
    upsertStaffAccount(smokeStaff.superAdmin),
  ]);

  const [adviserSession, technicianSession, superAdminSession] = await Promise.all([
    login(adviser.email),
    login(technician.email),
    login(superAdmin.email),
  ]);

  const services = await requestJson<Array<{ id: string; name: string; isActive?: boolean }>>('/services');
  const timeSlots = await requestJson<Array<{ id: string; label: string; isActive?: boolean }>>('/time-slots');
  const activeService = services.find((service) => service.isActive !== false);
  const activeTimeSlot = timeSlots.find((timeSlot) => timeSlot.isActive !== false);

  if (!activeService || !activeTimeSlot) {
    throw new Error('Smoke test requires at least one active service and one active time slot.');
  }

  const customer = await requestJson<{ id: string }>('/users', {
    method: 'POST',
    body: {
      email: `smoke.customer.t532.${smokeRunId}@example.com`,
      firstName: 'Smoke',
      lastName: 'Customer',
    },
  });
  const vehicle = await requestJson<{ id: string }>('/vehicles', {
    method: 'POST',
    body: {
      userId: customer.id,
      plateNumber: `T532${smokeRunId.slice(-5)}`,
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
    },
  });
  const booking = await requestJson<{ id: string }>('/bookings', {
    method: 'POST',
    body: {
      userId: customer.id,
      vehicleId: vehicle.id,
      timeSlotId: activeTimeSlot.id,
      scheduledDate: '2026-06-20',
      serviceIds: [activeService.id],
      notes: 'Engine rattling noise during cold start.',
    },
  });

  await requestJson(`/bookings/${booking.id}/status`, {
    method: 'PATCH',
    token: adviserSession.accessToken,
    body: {
      status: 'confirmed',
      reason: 'T532 smoke booking confirmed for job-order handoff.',
    },
  });

  const jobOrder = await requestJson<{
    id: string;
    items: Array<{ id: string }>;
    status: string;
  }>('/job-orders', {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      sourceType: 'booking',
      sourceId: booking.id,
      customerUserId: customer.id,
      vehicleId: vehicle.id,
      serviceAdviserUserId: adviser.id,
      serviceAdviserCode: adviser.staffCode,
      notes: 'Resolve the customer engine rattle concern before release.',
      items: [
        {
          name: 'Resolve engine rattling noise',
          description: 'Inspect drive belt, pulleys, and cold-start mounting points.',
        },
      ],
      assignedTechnicianIds: [technician.id],
    },
  });

  await requestJson(`/job-orders/${jobOrder.id}/status`, {
    method: 'PATCH',
    token: technicianSession.accessToken,
    body: {
      status: 'in_progress',
      reason: 'T532 smoke technician started diagnostics.',
    },
  });
  await requestJson(`/job-orders/${jobOrder.id}/progress`, {
    method: 'POST',
    token: technicianSession.accessToken,
    body: {
      entryType: 'work_completed',
      message: 'Engine rattle inspection, drive belt check, and cold-start mounting review completed.',
      completedItemIds: [jobOrder.items[0].id],
    },
  });
  await requestJson(`/job-orders/${jobOrder.id}/photos`, {
    method: 'POST',
    token: adviserSession.accessToken,
    body: {
      fileName: `t532-smoke-${smokeRunId}.jpg`,
      fileUrl: `https://files.example.com/smoke/t532-${smokeRunId}.jpg`,
      caption: 'T532 smoke QA evidence photo.',
    },
  });
  const readyForQa = await requestJson<{ status: string }>(`/job-orders/${jobOrder.id}/status`, {
    method: 'PATCH',
    token: technicianSession.accessToken,
    body: {
      status: 'ready_for_qa',
      reason: 'T532 smoke handoff to QA.',
    },
  });
  const qualityGate = await waitForTerminalQa(jobOrder.id, adviserSession.accessToken);
  const releaseGate = qualityGate.status === 'blocked'
    ? await requestJson<{ status: string }>(`/job-orders/${jobOrder.id}/qa/override`, {
        method: 'PATCH',
        token: superAdminSession.accessToken,
        body: {
          reason: `T532 smoke override after blocked QA: ${qualityGate.blockingReason ?? 'manual review completed'}`,
        },
      })
    : qualityGate;
  const finalized = await requestJson<{ id: string; status: string; invoiceRecord: { id: string } }>(
    `/job-orders/${jobOrder.id}/finalize`,
    {
      method: 'POST',
      token: adviserSession.accessToken,
      body: {
        summary: 'T532 smoke finalized after QA release gate.',
      },
    },
  );
  const paid = await requestJson<{ invoiceRecord: { paymentStatus: string } }>(
    `/job-orders/${jobOrder.id}/invoice/payments`,
    {
      method: 'POST',
      token: adviserSession.accessToken,
      body: {
        amountPaidCents: 159900,
        paymentMethod: 'cash',
        reference: `T532-SMOKE-${smokeRunId}`,
        receivedAt: new Date().toISOString(),
      },
    },
  );

  console.log(JSON.stringify({
    status: 'ok',
    apiBaseUrl,
    bookingId: booking.id,
    jobOrderId: jobOrder.id,
    readyForQaStatus: readyForQa.status,
    qaStatus: qualityGate.status,
    releaseStatus: releaseGate.status,
    finalizedStatus: finalized.status,
    invoiceRecordId: finalized.invoiceRecord.id,
    paymentStatus: paid.invoiceRecord.paymentStatus,
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
