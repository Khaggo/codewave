import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

type BookingServiceSeed = {
  name: string;
  category: string;
  pricePhp: number;
  durationMinutes: number;
  description: string;
};

type BookingTimeSlotSeed = {
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
};

const loadLocalEnv = () => {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env'), 'utf8');

    envFile.split(/\r?\n/).forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        return;
      }

      const separatorIndex = trimmedLine.indexOf('=');

      if (separatorIndex === -1) {
        return;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // Allow CI or shells that already provide DATABASE_URL.
  }
};

const bookingServiceCatalog: BookingServiceSeed[] = [
  {
    name: 'Oil Change (Engine Oil + Filter)',
    category: 'Preventive Maintenance',
    pricePhp: 850,
    durationMinutes: 45,
    description: 'Engine oil and oil filter replacement for routine maintenance.',
  },
  {
    name: 'PMS 10,000 km Package',
    category: 'Preventive Maintenance',
    pricePhp: 2500,
    durationMinutes: 120,
    description: 'Preventive maintenance package for the 10,000 km service interval.',
  },
  {
    name: 'PMS 20,000 km Package',
    category: 'Preventive Maintenance',
    pricePhp: 4500,
    durationMinutes: 180,
    description: 'Expanded preventive maintenance package for the 20,000 km interval.',
  },
  {
    name: 'Air Filter Replacement',
    category: 'Preventive Maintenance',
    pricePhp: 450,
    durationMinutes: 30,
    description: 'Inspect and replace the engine air filter.',
  },
  {
    name: 'Fuel Filter Replacement',
    category: 'Preventive Maintenance',
    pricePhp: 650,
    durationMinutes: 45,
    description: 'Replace the fuel filter and inspect fuel-line condition.',
  },
  {
    name: 'Brake Pad Replacement (Front)',
    category: 'Repair',
    pricePhp: 2200,
    durationMinutes: 90,
    description: 'Replace front brake pads and inspect rotor contact surfaces.',
  },
  {
    name: 'Brake Pad Replacement (Rear)',
    category: 'Repair',
    pricePhp: 2000,
    durationMinutes: 90,
    description: 'Replace rear brake pads and inspect rear brake components.',
  },
  {
    name: 'Cooling System Flush',
    category: 'Repair',
    pricePhp: 1500,
    durationMinutes: 75,
    description: 'Flush and refill the engine cooling system.',
  },
  {
    name: 'Wheel Alignment',
    category: 'Repair',
    pricePhp: 800,
    durationMinutes: 60,
    description: 'Check and adjust wheel alignment for safer handling.',
  },
  {
    name: 'Suspension Check & Repair',
    category: 'Repair',
    pricePhp: 3500,
    durationMinutes: 150,
    description: 'Inspect suspension components and perform basic repair work.',
  },
  {
    name: 'Tire Rotation',
    category: 'Tires & Wheels',
    pricePhp: 350,
    durationMinutes: 30,
    description: 'Rotate tires according to recommended wear pattern.',
  },
  {
    name: 'Tire Replacement (per piece)',
    category: 'Tires & Wheels',
    pricePhp: 4500,
    durationMinutes: 45,
    description: 'Replace one tire and inspect wheel condition.',
  },
  {
    name: 'Tire Balancing (4 pcs)',
    category: 'Tires & Wheels',
    pricePhp: 600,
    durationMinutes: 45,
    description: 'Balance four tires to reduce vibration and uneven wear.',
  },
  {
    name: 'Engine Diagnostic Scan',
    category: 'Diagnostics',
    pricePhp: 700,
    durationMinutes: 45,
    description: 'Run an engine diagnostic scan and review fault indicators.',
  },
  {
    name: 'Pre-purchase Inspection',
    category: 'Diagnostics',
    pricePhp: 1200,
    durationMinutes: 90,
    description: 'Inspect a vehicle before purchase and report visible concerns.',
  },
  {
    name: 'Interior Deep Clean',
    category: 'Detailing',
    pricePhp: 1800,
    durationMinutes: 120,
    description: 'Deep clean interior surfaces, seats, carpets, and trims.',
  },
  {
    name: 'Full Car Detailing',
    category: 'Detailing',
    pricePhp: 4500,
    durationMinutes: 240,
    description: 'Full interior and exterior detailing service.',
  },
  {
    name: 'Paint Protection Film (PPF)',
    category: 'Detailing',
    pricePhp: 18000,
    durationMinutes: 360,
    description: 'Apply paint protection film to selected exterior panels.',
  },
];

const bookingTimeSlotCatalog: BookingTimeSlotSeed[] = [
  {
    label: 'Morning Intake',
    startTime: '08:00',
    endTime: '09:30',
    capacity: 4,
  },
  {
    label: 'Morning Service',
    startTime: '09:30',
    endTime: '11:00',
    capacity: 4,
  },
  {
    label: 'Midday Diagnostics',
    startTime: '11:00',
    endTime: '12:30',
    capacity: 3,
  },
  {
    label: 'Afternoon Intake',
    startTime: '13:00',
    endTime: '14:30',
    capacity: 4,
  },
  {
    label: 'Afternoon Service',
    startTime: '14:30',
    endTime: '16:00',
    capacity: 4,
  },
  {
    label: 'Late-Day Pickup / Quick Checks',
    startTime: '16:00',
    endTime: '17:30',
    capacity: 2,
  },
];

const run = async () => {
  loadLocalEnv();

  const connectionString = process.env.DATABASE_URL ?? 'postgresql://admin:root@localhost:5433/codewave';
  const client = new Client({ connectionString });

  await client.connect();

  try {
    await client.query('begin');

    const categoryIds = new Map<string, string>();
    const categories = Array.from(new Set(bookingServiceCatalog.map((service) => service.category)));

    for (const categoryName of categories) {
      const result = await client.query<{ id: string }>(
        `
          insert into service_categories (name, description, is_active, updated_at)
          values ($1, $2, true, now())
          on conflict (name)
          do update set description = excluded.description, is_active = true, updated_at = now()
          returning id
        `,
        [categoryName, `${categoryName} booking services.`],
      );

      categoryIds.set(categoryName, result.rows[0].id);
    }

    const oilChangeSeed = bookingServiceCatalog[0];

    await client.query(
      `
        update services
        set
          name = $1,
          category_id = $2,
          description = $3,
          duration_minutes = $4,
          is_active = true,
          updated_at = now()
        where name = 'Smoke Test Oil Change'
          and not exists (select 1 from services where name = $1)
      `,
      [
        oilChangeSeed.name,
        categoryIds.get(oilChangeSeed.category),
        `${oilChangeSeed.description} Reference price: PHP ${oilChangeSeed.pricePhp}.`,
        oilChangeSeed.durationMinutes,
      ],
    );

    for (const service of bookingServiceCatalog) {
      await client.query(
        `
          insert into services (category_id, name, description, duration_minutes, is_active, updated_at)
          values ($1, $2, $3, $4, true, now())
          on conflict (name)
          do update set
            category_id = excluded.category_id,
            description = excluded.description,
            duration_minutes = excluded.duration_minutes,
            is_active = true,
            updated_at = now()
        `,
        [
          categoryIds.get(service.category),
          service.name,
          `${service.description} Reference price: PHP ${service.pricePhp}.`,
          service.durationMinutes,
        ],
      );
    }

    const firstSlotSeed = bookingTimeSlotCatalog[0];

    await client.query(
      `
        update time_slots
        set
          label = $1,
          start_time = $2,
          end_time = $3,
          capacity = $4,
          is_active = true,
          updated_at = now()
        where label = 'Smoke Test Priority Slot'
          and not exists (select 1 from time_slots where label = $1::varchar)
      `,
      [
        firstSlotSeed.label,
        firstSlotSeed.startTime,
        firstSlotSeed.endTime,
        firstSlotSeed.capacity,
      ],
    );

    for (const slot of bookingTimeSlotCatalog) {
      await client.query(
        `
          update time_slots
          set
            start_time = $2,
            end_time = $3,
            capacity = $4,
            is_active = true,
            updated_at = now()
          where label = $1::varchar
        `,
        [slot.label, slot.startTime, slot.endTime, slot.capacity],
      );

      await client.query(
        `
          insert into time_slots (label, start_time, end_time, capacity, is_active, updated_at)
          select $1::varchar, $2::varchar, $3::varchar, $4, true, now()
          where not exists (select 1 from time_slots where label = $1::varchar)
        `,
        [slot.label, slot.startTime, slot.endTime, slot.capacity],
      );
    }

    await client.query('commit');

    console.log(
      `Seeded ${bookingServiceCatalog.length} booking services across ${categories.length} categories and ${bookingTimeSlotCatalog.length} time slots.`,
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
};

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
