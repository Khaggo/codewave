import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { Pool } from 'pg';

type StaffRole = 'technician' | 'head_technician' | 'service_adviser';
type CustomerSeedAccount = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
};
type StaffSeedAccount = CustomerSeedAccount & {
  role: StaffRole;
  staffCode: string;
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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed booking-to-job-order QA accounts.');
}

const pool = new Pool({ connectionString: databaseUrl });

const qaPassword = process.env.BOOKING_JOB_ORDER_QA_PASSWORD ?? 'Password1.';

const qaAccounts = {
  customer: {
    email: 'qa.booking.customer@example.com',
    firstName: 'Queue',
    lastName: 'Customer',
    phone: '+639170000101',
  } satisfies CustomerSeedAccount,
  adviser: {
    email: 'qa.booking.adviser@autocare.com',
    firstName: 'Queue',
    lastName: 'Adviser',
    phone: '+639170000102',
    role: 'service_adviser' as const,
    staffCode: 'QA-JO-SA',
  } satisfies StaffSeedAccount,
  technician: {
    email: 'qa.booking.tech@autocare.com',
    firstName: 'Queue',
    lastName: 'Technician',
    phone: '+639170000103',
    role: 'technician' as const,
    staffCode: 'QA-JO-TEC',
  } satisfies StaffSeedAccount,
  headTechnician: {
    email: 'qa.booking.headtech@autocare.com',
    firstName: 'Queue',
    lastName: 'Headtech',
    phone: '+639170000104',
    role: 'head_technician' as const,
    staffCode: 'QA-JO-HTC',
  } satisfies StaffSeedAccount,
};

async function upsertCustomerAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(qaPassword, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query<{ id: string; email: string }>(
      `
        INSERT INTO users (email, role, is_active, deleted_email, deleted_at)
        VALUES ($1, 'customer', true, null, null)
        ON CONFLICT (email)
        DO UPDATE SET
          role = 'customer',
          is_active = true,
          deleted_email = null,
          deleted_at = null,
          updated_at = now()
        RETURNING id, email
      `,
      [input.email],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_profiles (user_id, first_name, last_name, phone)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          updated_at = now()
      `,
      [user.id, input.firstName, input.lastName, input.phone ?? null],
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

    await client.query(
      `
        INSERT INTO vehicles (user_id, plate_number, make, model, year, color, notes)
        VALUES ($1, $2, 'Toyota', 'Vios', 2019, 'Silver', 'Seeded QA vehicle for booking-to-job-order flow.')
        ON CONFLICT (plate_number)
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          make = EXCLUDED.make,
          model = EXCLUDED.model,
          year = EXCLUDED.year,
          color = EXCLUDED.color,
          notes = EXCLUDED.notes,
          updated_at = now()
      `,
      [user.id, 'QAJO1001'],
    );

    await client.query('COMMIT');

    return {
      email: user.email,
      role: 'customer',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function upsertStaffAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: StaffRole;
  staffCode: string;
}) {
  const passwordHash = await bcrypt.hash(qaPassword, 10);
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
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          updated_at = now()
      `,
      [user.id, input.firstName, input.lastName, input.phone ?? null],
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
      email: user.email,
      role: input.role,
      staffCode: user.staff_code,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const seededCustomer = await upsertCustomerAccount(qaAccounts.customer);
  const seededStaff = await Promise.all([
    upsertStaffAccount(qaAccounts.adviser),
    upsertStaffAccount(qaAccounts.technician),
    upsertStaffAccount(qaAccounts.headTechnician),
  ]);

  console.log(
    JSON.stringify(
      {
        password: qaPassword,
        customer: seededCustomer,
        staff: seededStaff,
        seededVehiclePlate: 'QAJO1001',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
