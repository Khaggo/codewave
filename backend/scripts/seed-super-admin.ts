import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

import { assertOperationalSafety, parseOperationalArgs } from './operational-safety';
import { requireSeedPassword } from './lib/seed-credential-safety';

const databaseUrl = process.env.DATABASE_URL;
const email = (process.env.SUPER_ADMIN_SEED_EMAIL ?? 'railway.superadmin@autocare.com')
  .trim()
  .toLowerCase();
const staffCode = (process.env.SUPER_ADMIN_SEED_STAFF_CODE ?? 'SA-RAILWAY-001').trim();
const firstName = (process.env.SUPER_ADMIN_SEED_FIRST_NAME ?? 'Railway').trim();
const lastName = (process.env.SUPER_ADMIN_SEED_LAST_NAME ?? 'Administrator').trim();

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed a super-admin account.');
}

if (!email || !staffCode || !firstName || !lastName) {
  throw new Error('Super-admin seed identity values must not be empty.');
}

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const args = parseOperationalArgs(process.argv.slice(2));
  const safety = assertOperationalSafety({
    command: 'seed:super-admin',
    args,
    databaseUrl,
  });

  if (!args.execute) {
    console.log(
      JSON.stringify(
        {
          safety,
          target: { email, role: 'super_admin', staffCode, firstName, lastName },
          mutation: 'upsert one named staff identity, profile, and password account',
        },
        null,
        2,
      ),
    );
    return;
  }

  const password = requireSeedPassword(
    process.env.SUPER_ADMIN_SEED_PASSWORD,
    'SUPER_ADMIN_SEED_PASSWORD',
  );
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const userResult = await client.query<{ id: string; email: string; staff_code: string }>(
      `
        INSERT INTO users (email, role, staff_code, is_active, deleted_email, deleted_at)
        VALUES ($1, 'super_admin', $2, true, null, null)
        ON CONFLICT (email)
        DO UPDATE SET
          role = 'super_admin',
          staff_code = EXCLUDED.staff_code,
          is_active = true,
          deleted_email = null,
          deleted_at = null,
          updated_at = now()
        RETURNING id, email, staff_code
      `,
      [email, staffCode],
    );
    const user = userResult.rows[0];

    await client.query(
      `
        INSERT INTO user_profiles (user_id, first_name, last_name)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          updated_at = now()
      `,
      [user.id, firstName, lastName],
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
    console.log(
      JSON.stringify(
        {
          seeded: true,
          credentialSource: 'SUPER_ADMIN_SEED_PASSWORD',
          account: { email: user.email, role: 'super_admin', staffCode: user.staff_code },
          safety,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
