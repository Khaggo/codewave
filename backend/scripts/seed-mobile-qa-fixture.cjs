const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { requireSeedPassword } = require('./lib/seed-credential-safety.ts');
const {
  assertLocalMobileQaFixtureSafety,
  getStableFixtureIdentifiers,
} = require('./lib/mobile-qa-fixture.cjs');

const execute = process.argv.slice(2).includes('--execute');
const databaseUrl = process.env.DATABASE_URL;
const email = process.env.MOBILE_QA_EMAIL;
const identifiers = getStableFixtureIdentifiers(email);
const safety = assertLocalMobileQaFixtureSafety({
  nodeEnv: process.env.NODE_ENV,
  databaseUrl,
  execute,
});
const planned = {
  customers: 1,
  vehicles: 3,
  bookings: 12,
  insuranceHistory: 1,
  garageTimelineMinimum: 13,
  accessoryProducts: 2,
  accessoryVariants: 2,
  accessoryStockRows: 2,
};

if (!execute) {
  console.log(JSON.stringify({ safety, planned, emailFingerprint: identifiers.emailFingerprint }, null, 2));
  process.exit(0);
}

const password = requireSeedPassword(
  process.env.MOBILE_QA_PASSWORD,
  'MOBILE_QA_PASSWORD',
);
const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });

const vehicles = [
  { plate: identifiers.vehiclePlates[0], make: 'Toyota', model: 'Vios', year: 2022, color: 'Silver' },
  { plate: identifiers.vehiclePlates[1], make: 'Honda', model: 'City', year: 2021, color: 'White' },
  { plate: identifiers.vehiclePlates[2], make: 'Mitsubishi', model: 'Mirage', year: 2020, color: 'Blue' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (email, role, is_active, deleted_email, deleted_at)
       VALUES ($1, 'customer', true, null, null)
       ON CONFLICT (email) DO UPDATE SET role='customer', is_active=true,
         deleted_email=null, deleted_at=null, updated_at=now()
       RETURNING id`,
      [identifiers.email],
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `INSERT INTO user_profiles (user_id, first_name, last_name, phone)
       VALUES ($1, 'Mobile', 'QA Customer', '+639170009901')
       ON CONFLICT (user_id) DO UPDATE SET first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name, phone=EXCLUDED.phone, updated_at=now()`,
      [userId],
    );
    await client.query(
      `INSERT INTO auth_accounts (user_id, password_hash, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,
         is_active=true, updated_at=now()`,
      [userId, passwordHash],
    );

    const vehicleIds = [];
    for (const vehicle of vehicles) {
      const result = await client.query(
        `INSERT INTO vehicles (user_id, plate_number, make, model, year, color, notes)
         VALUES ($1,$2,$3,$4,$5,$6,'QA-only mobile fixture vehicle.')
         ON CONFLICT (plate_number) DO UPDATE SET user_id=EXCLUDED.user_id,
           make=EXCLUDED.make, model=EXCLUDED.model, year=EXCLUDED.year,
           color=EXCLUDED.color, notes=EXCLUDED.notes, updated_at=now()
         RETURNING id`,
        [userId, vehicle.plate, vehicle.make, vehicle.model, vehicle.year, vehicle.color],
      );
      vehicleIds.push(result.rows[0].id);
    }

    const serviceResult = await client.query(
      `SELECT id FROM services WHERE is_active=true ORDER BY created_at, id LIMIT 1`,
    );
    const slotResult = await client.query(
      `SELECT id FROM time_slots WHERE is_active=true AND deleted_at IS NULL ORDER BY created_at, id LIMIT 1`,
    );
    if (!serviceResult.rowCount || !slotResult.rowCount) {
      throw new Error('Run the local booking catalog seed before the mobile QA fixture.');
    }
    const serviceId = serviceResult.rows[0].id;
    const timeSlotId = slotResult.rows[0].id;

    for (let index = 0; index < identifiers.bookingReferences.length; index += 1) {
      const isFuture = index === identifiers.bookingReferences.length - 1;
      const scheduledOffset = isFuture ? 7 : -(index + 1);
      const status = isFuture ? 'confirmed' : 'completed';
      const bookingResult = await client.query(
        `INSERT INTO bookings
          (booking_reference,user_id,vehicle_id,time_slot_id,scheduled_date,status,notes,created_at)
         VALUES ($1,$2,$3,$4,(current_date + $5::int),$6,'QA-only mobile booking fixture.',
           now() - (($7 + 1)::text || ' days')::interval)
         ON CONFLICT (booking_reference) DO UPDATE SET user_id=EXCLUDED.user_id,
           vehicle_id=EXCLUDED.vehicle_id,time_slot_id=EXCLUDED.time_slot_id,
           scheduled_date=EXCLUDED.scheduled_date,status=EXCLUDED.status,
           notes=EXCLUDED.notes,updated_at=now()
         RETURNING id`,
        [
          identifiers.bookingReferences[index],
          userId,
          vehicleIds[index % vehicleIds.length],
          timeSlotId,
          scheduledOffset,
          status,
          index,
        ],
      );
      await client.query(
        `INSERT INTO booking_services (booking_id,service_id)
         VALUES ($1,$2) ON CONFLICT (booking_id,service_id) DO NOTHING`,
        [bookingResult.rows[0].id, serviceId],
      );
    }

    await client.query(
      `INSERT INTO insurance_inquiries
        (inquiry_reference,user_id,vehicle_id,client_request_id,inquiry_type,purpose,
         subject,description,status,document_status,payment_status,renewal_status,created_by_user_id,created_at)
       VALUES ($1,$2,$3,$4,'comprehensive','quotation','QA historical insurance baseline',
         'QA-only closed history row; Terra must not submit a new request.','closed','complete',
         'not_required','not_applicable',$2,now() - interval '20 days')
       ON CONFLICT (inquiry_reference) DO UPDATE SET user_id=EXCLUDED.user_id,
         vehicle_id=EXCLUDED.vehicle_id,subject=EXCLUDED.subject,
         description=EXCLUDED.description,status='closed',updated_at=now()`,
      [identifiers.insuranceReference, userId, vehicleIds[0], identifiers.insuranceClientRequestId],
    );

    const categoryResult = await client.query(
      `INSERT INTO accessory_categories (slug,name,description,status,display_order)
       VALUES ($1,'QA Mobile Accessories','Synthetic local/test-only QA catalog.','active',9900)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,
         status='active',display_order=EXCLUDED.display_order,updated_at=now()
       RETURNING id`,
      [identifiers.accessoryCategorySlug],
    );
    const categoryId = categoryResult.rows[0].id;
    for (const product of identifiers.accessoryProducts) {
      const productResult = await client.query(
        `INSERT INTO accessory_products (category_id,slug,name,description,status,is_lighting)
         VALUES ($1,$2,$3,'Synthetic QA-only product; not a production catalog claim.','active',false)
         ON CONFLICT (slug) DO UPDATE SET category_id=EXCLUDED.category_id,name=EXCLUDED.name,
           description=EXCLUDED.description,status='active',is_lighting=false,updated_at=now()
         RETURNING id`,
        [categoryId, product.slug, product.name],
      );
      const variantResult = await client.query(
        `INSERT INTO accessory_variants (product_id,sku,name,attributes,price_cents,currency_code,is_active)
         VALUES ($1,$2,$3,'{"qaOnly":"true"}'::jsonb,$4,'PHP',true)
         ON CONFLICT (sku) DO UPDATE SET product_id=EXCLUDED.product_id,name=EXCLUDED.name,
           attributes=EXCLUDED.attributes,price_cents=EXCLUDED.price_cents,is_active=true,updated_at=now()
         RETURNING id`,
        [productResult.rows[0].id, product.sku, product.variantName, product.priceCents],
      );
      await client.query(
        `INSERT INTO accessory_inventory_balances (variant_id,on_hand_quantity,reserved_quantity)
         VALUES ($1,$2,0) ON CONFLICT (variant_id) DO UPDATE SET
           on_hand_quantity=EXCLUDED.on_hand_quantity,reserved_quantity=0,updated_at=now()`,
        [variantResult.rows[0].id, product.stock],
      );
    }

    const counts = await client.query(
      `SELECT
        (SELECT count(*)::int FROM users WHERE email=$1) AS customers,
        (SELECT count(*)::int FROM vehicles WHERE user_id=$2 AND plate_number=ANY($3::text[])) AS vehicles,
        (SELECT count(*)::int FROM bookings WHERE user_id=$2 AND booking_reference=ANY($4::text[])) AS bookings,
        (SELECT count(*)::int FROM insurance_inquiries WHERE user_id=$2 AND inquiry_reference=$5) AS insurance_history,
        (SELECT count(*)::int FROM accessory_products WHERE slug=ANY($6::text[]) AND status='active') AS accessory_products,
        (SELECT count(*)::int FROM accessory_variants WHERE sku=ANY($7::text[]) AND is_active=true) AS accessory_variants`,
      [
        identifiers.email,
        userId,
        identifiers.vehiclePlates,
        identifiers.bookingReferences,
        identifiers.insuranceReference,
        identifiers.accessoryProducts.map((item) => item.slug),
        identifiers.accessoryProducts.map((item) => item.sku),
      ],
    );
    await client.query('COMMIT');
    return counts.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then((counts) => console.log(JSON.stringify({ safety, counts, credentialSource: 'MOBILE_QA_PASSWORD', emailFingerprint: identifiers.emailFingerprint }, null, 2)))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Mobile QA fixture failed.');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
