CREATE SEQUENCE "vehicles_public_reference_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;--> statement-breakpoint
CREATE SEQUENCE "job_orders_reference_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;--> statement-breakpoint
CREATE SEQUENCE "insurance_inquiries_reference_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;--> statement-breakpoint
CREATE SEQUENCE "back_jobs_reference_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;--> statement-breakpoint

ALTER TABLE "vehicles" ADD COLUMN "public_reference" varchar(24);--> statement-breakpoint
ALTER TABLE "job_orders" ADD COLUMN "job_order_reference" varchar(24);--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD COLUMN "inquiry_reference" varchar(24);--> statement-breakpoint
ALTER TABLE "back_jobs" ADD COLUMN "back_job_reference" varchar(24);--> statement-breakpoint

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS sequence_number
  FROM "vehicles"
)
UPDATE "vehicles" AS target
SET "public_reference" =
  'VEH-' || to_char(target.created_at AT TIME ZONE 'UTC', 'YYYY') || '-' ||
  lpad(ranked.sequence_number::text, 6, '0')
FROM ranked
WHERE target.id = ranked.id;--> statement-breakpoint

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS sequence_number
  FROM "job_orders"
)
UPDATE "job_orders" AS target
SET "job_order_reference" =
  'JO-' || to_char(target.created_at AT TIME ZONE 'UTC', 'YYYY') || '-' ||
  lpad(ranked.sequence_number::text, 6, '0')
FROM ranked
WHERE target.id = ranked.id;--> statement-breakpoint

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS sequence_number
  FROM "insurance_inquiries"
)
UPDATE "insurance_inquiries" AS target
SET "inquiry_reference" =
  'INS-' || to_char(target.created_at AT TIME ZONE 'UTC', 'YYYY') || '-' ||
  lpad(ranked.sequence_number::text, 6, '0')
FROM ranked
WHERE target.id = ranked.id;--> statement-breakpoint

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS sequence_number
  FROM "back_jobs"
)
UPDATE "back_jobs" AS target
SET "back_job_reference" =
  'BJ-' || to_char(target.created_at AT TIME ZONE 'UTC', 'YYYY') || '-' ||
  lpad(ranked.sequence_number::text, 6, '0')
FROM ranked
WHERE target.id = ranked.id;--> statement-breakpoint

SELECT setval(
  'vehicles_public_reference_seq',
  GREATEST((SELECT count(*) FROM "vehicles"), 1),
  (SELECT count(*) > 0 FROM "vehicles")
);--> statement-breakpoint
SELECT setval(
  'job_orders_reference_seq',
  GREATEST((SELECT count(*) FROM "job_orders"), 1),
  (SELECT count(*) > 0 FROM "job_orders")
);--> statement-breakpoint
SELECT setval(
  'insurance_inquiries_reference_seq',
  GREATEST((SELECT count(*) FROM "insurance_inquiries"), 1),
  (SELECT count(*) > 0 FROM "insurance_inquiries")
);--> statement-breakpoint
SELECT setval(
  'back_jobs_reference_seq',
  GREATEST((SELECT count(*) FROM "back_jobs"), 1),
  (SELECT count(*) > 0 FROM "back_jobs")
);--> statement-breakpoint

ALTER TABLE "vehicles"
  ALTER COLUMN "public_reference" SET DEFAULT
    ('VEH-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('vehicles_public_reference_seq')::text, 6, '0')),
  ALTER COLUMN "public_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "job_orders"
  ALTER COLUMN "job_order_reference" SET DEFAULT
    ('JO-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('job_orders_reference_seq')::text, 6, '0')),
  ALTER COLUMN "job_order_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_inquiries"
  ALTER COLUMN "inquiry_reference" SET DEFAULT
    ('INS-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('insurance_inquiries_reference_seq')::text, 6, '0')),
  ALTER COLUMN "inquiry_reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "back_jobs"
  ALTER COLUMN "back_job_reference" SET DEFAULT
    ('BJ-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('back_jobs_reference_seq')::text, 6, '0')),
  ALTER COLUMN "back_job_reference" SET NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX "vehicles_public_reference_idx" ON "vehicles" USING btree ("public_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "job_orders_job_order_reference_idx" ON "job_orders" USING btree ("job_order_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_inquiries_inquiry_reference_idx" ON "insurance_inquiries" USING btree ("inquiry_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "back_jobs_back_job_reference_idx" ON "back_jobs" USING btree ("back_job_reference");--> statement-breakpoint

CREATE FUNCTION "prevent_business_reference_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  reference_column text := TG_ARGV[0];
BEGIN
  IF to_jsonb(NEW) ->> reference_column IS DISTINCT FROM to_jsonb(OLD) ->> reference_column THEN
    RAISE EXCEPTION '% is immutable', reference_column USING ERRCODE = '27000';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER "vehicles_public_reference_immutable"
BEFORE UPDATE ON "vehicles"
FOR EACH ROW EXECUTE FUNCTION "prevent_business_reference_change"('public_reference');--> statement-breakpoint
CREATE TRIGGER "job_orders_reference_immutable"
BEFORE UPDATE ON "job_orders"
FOR EACH ROW EXECUTE FUNCTION "prevent_business_reference_change"('job_order_reference');--> statement-breakpoint
CREATE TRIGGER "insurance_inquiries_reference_immutable"
BEFORE UPDATE ON "insurance_inquiries"
FOR EACH ROW EXECUTE FUNCTION "prevent_business_reference_change"('inquiry_reference');--> statement-breakpoint
CREATE TRIGGER "back_jobs_reference_immutable"
BEFORE UPDATE ON "back_jobs"
FOR EACH ROW EXECUTE FUNCTION "prevent_business_reference_change"('back_job_reference');
