DO $$
BEGIN
  CREATE TYPE "public"."staff_queue_session_status" AS ENUM('available', 'paused');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."staff_work_claim_status" AS ENUM('active', 'completed', 'released', 'expired', 'reassigned');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."staff_work_entity_type" AS ENUM('booking_handoff', 'job_order');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."staff_work_queue_type" AS ENUM('job_order', 'qa');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

ALTER TABLE "job_order_progress_logs"
  ADD COLUMN IF NOT EXISTS "work_item_id" uuid;--> statement-breakpoint
ALTER TABLE "job_orders"
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_inquiries"
  ADD COLUMN IF NOT EXISTS "client_request_id" uuid;--> statement-breakpoint
ALTER TABLE "insurance_inquiries"
  ADD COLUMN IF NOT EXISTS "incident_occurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "insurance_inquiries"
  ADD COLUMN IF NOT EXISTS "incident_location" varchar(255);--> statement-breakpoint
ALTER TABLE "insurance_activities"
  ADD COLUMN IF NOT EXISTS "customer_message" text;--> statement-breakpoint
ALTER TABLE "job_order_quality_gates"
  ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "staff_queue_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "queue_type" "staff_work_queue_type" NOT NULL,
  "status" "staff_queue_session_status" DEFAULT 'paused' NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_assigned_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_work_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "queue_type" "staff_work_queue_type" NOT NULL,
  "entity_type" "staff_work_entity_type" NOT NULL,
  "entity_id" uuid NOT NULL,
  "owner_user_id" uuid NOT NULL,
  "status" "staff_work_claim_status" DEFAULT 'active' NOT NULL,
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lease_expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "released_at" timestamp with time zone,
  "release_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_order_progress_logs_work_item_id_job_order_items_id_fk'
  ) THEN
    ALTER TABLE "job_order_progress_logs"
      ADD CONSTRAINT "job_order_progress_logs_work_item_id_job_order_items_id_fk"
      FOREIGN KEY ("work_item_id") REFERENCES "public"."job_order_items"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_queue_sessions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "staff_queue_sessions"
      ADD CONSTRAINT "staff_queue_sessions_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_work_claims_owner_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "staff_work_claims"
      ADD CONSTRAINT "staff_work_claims_owner_user_id_users_id_fk"
      FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "insurance_inquiries_user_client_request_idx"
  ON "insurance_inquiries" USING btree ("user_id", "client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_queue_sessions_user_queue_idx"
  ON "staff_queue_sessions" USING btree ("user_id", "queue_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_queue_sessions_dispatch_order_idx"
  ON "staff_queue_sessions" USING btree ("queue_type", "status", "last_assigned_at", "last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "staff_work_claims_active_entity_idx"
  ON "staff_work_claims" USING btree ("queue_type", "entity_type", "entity_id")
  WHERE "staff_work_claims"."status" = 'active';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_work_claims_active_owner_queue_idx"
  ON "staff_work_claims" USING btree ("queue_type", "owner_user_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_work_claims_queue_status_lease_idx"
  ON "staff_work_claims" USING btree ("queue_type", "status", "lease_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_work_claims_entity_history_idx"
  ON "staff_work_claims" USING btree ("entity_type", "entity_id", "created_at");
