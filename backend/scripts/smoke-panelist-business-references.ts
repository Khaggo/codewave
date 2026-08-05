import { randomUUID } from 'node:crypto';

import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for the business-reference smoke test.');
}

const databaseUrl = new URL(connectionString);
if (!['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)) {
  throw new Error('Business-reference smoke testing is limited to a local PostgreSQL database.');
}

const pool = new pg.Pool({ connectionString, max: 24 });
const marker = randomUUID().replace(/-/g, '').slice(0, 10);
const expectedYear = new Date().getUTCFullYear();
const created = {
  customerUserId: '',
  adviserUserId: '',
};

const assertReferences = (label: string, prefix: string, rows: Array<{ reference: string }>) => {
  if (rows.length !== 100) {
    throw new Error(`${label} expected 100 records, received ${rows.length}.`);
  }
  const values = rows.map(({ reference }) => reference);
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} generated duplicate references.`);
  }
  const pattern = new RegExp(`^${prefix}-${expectedYear}-\\d{6}$`);
  const invalid = values.find((value) => !pattern.test(value));
  if (invalid) {
    throw new Error(`${label} generated an invalid reference: ${invalid}.`);
  }
};

const assertImmutable = async (table: string, id: string, column: string) => {
  try {
    await pool.query(`update ${table} set ${column} = 'INVALID-REFERENCE' where id = $1`, [id]);
    throw new Error(`${table}.${column} accepted an update.`);
  } catch (error) {
    if ((error as { code?: string }).code !== '27000') {
      throw error;
    }
  }
};

try {
  const customer = await pool.query<{ id: string }>(
    `insert into users (email, role) values ($1, 'customer') returning id`,
    [`reference-smoke-customer-${marker}@example.test`],
  );
  const adviser = await pool.query<{ id: string }>(
    `insert into users (email, role, staff_code) values ($1, 'service_adviser', $2) returning id`,
    [`reference-smoke-adviser-${marker}@example.test`, `REF-${marker}`],
  );
  created.customerUserId = customer.rows[0].id;
  created.adviserUserId = adviser.rows[0].id;

  const vehicleRows = await Promise.all(
    Array.from({ length: 100 }, async (_, index) => {
      const result = await pool.query<{ id: string; reference: string }>(
        `insert into vehicles (user_id, plate_number, make, model, year)
         values ($1, $2, 'Reference', 'Fixture', $3)
         returning id, public_reference as reference`,
        [created.customerUserId, `R${marker}${String(index).padStart(3, '0')}`, expectedYear],
      );
      return result.rows[0];
    }),
  );
  assertReferences('Vehicles', 'VEH', vehicleRows);

  const jobOrderRows = await Promise.all(
    Array.from({ length: 100 }, async (_, index) => {
      const result = await pool.query<{ id: string; reference: string }>(
        `insert into job_orders (
           source_type, source_id, customer_user_id, vehicle_id,
           service_adviser_user_id, service_adviser_code, status
         ) values ('booking', $1, $2, $3, $4, $5, 'draft')
         returning id, job_order_reference as reference`,
        [
          randomUUID(),
          created.customerUserId,
          vehicleRows[index].id,
          created.adviserUserId,
          `REF-${marker}`,
        ],
      );
      return result.rows[0];
    }),
  );
  assertReferences('Job Orders', 'JO', jobOrderRows);

  const inquiryRows = await Promise.all(
    Array.from({ length: 100 }, async (_, index) => {
      const result = await pool.query<{ id: string; reference: string }>(
        `insert into insurance_inquiries (
           user_id, vehicle_id, inquiry_type, subject, description, created_by_user_id
         ) values ($1, $2, 'comprehensive', $3, $4, $1)
         returning id, inquiry_reference as reference`,
        [
          created.customerUserId,
          vehicleRows[index].id,
          `Reference smoke ${marker}`,
          'Temporary local concurrency fixture.',
        ],
      );
      return result.rows[0];
    }),
  );
  assertReferences('Insurance inquiries', 'INS', inquiryRows);

  const backJobRows = await Promise.all(
    Array.from({ length: 100 }, async (_, index) => {
      const result = await pool.query<{ id: string; reference: string }>(
        `insert into back_jobs (
           customer_user_id, vehicle_id, original_job_order_id, complaint, created_by_user_id
         ) values ($1, $2, $3, $4, $5)
         returning id, back_job_reference as reference`,
        [
          created.customerUserId,
          vehicleRows[index].id,
          jobOrderRows[index].id,
          'Temporary local concurrency fixture.',
          created.adviserUserId,
        ],
      );
      return result.rows[0];
    }),
  );
  assertReferences('Back-jobs', 'BJ', backJobRows);

  await assertImmutable('vehicles', vehicleRows[0].id, 'public_reference');
  await assertImmutable('job_orders', jobOrderRows[0].id, 'job_order_reference');
  await assertImmutable('insurance_inquiries', inquiryRows[0].id, 'inquiry_reference');
  await assertImmutable('back_jobs', backJobRows[0].id, 'back_job_reference');

  process.stdout.write('Business-reference smoke passed: 400 unique concurrent references and four immutable columns.\n');
} finally {
  if (created.adviserUserId) {
    await pool.query('delete from back_jobs where created_by_user_id = $1', [created.adviserUserId]);
    await pool.query('delete from job_orders where service_adviser_user_id = $1', [created.adviserUserId]);
  }
  if (created.customerUserId) {
    await pool.query('delete from insurance_inquiries where created_by_user_id = $1', [created.customerUserId]);
    await pool.query('delete from vehicles where user_id = $1', [created.customerUserId]);
    await pool.query('delete from users where id = $1', [created.customerUserId]);
  }
  if (created.adviserUserId) {
    await pool.query('delete from users where id = $1', [created.adviserUserId]);
  }
  await pool.end();
}
