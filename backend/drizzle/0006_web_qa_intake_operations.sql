CREATE TYPE "public"."job_order_invoice_correction_action" AS ENUM('payment_reversal_completed', 'void_and_reissue');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_lifecycle_status" AS ENUM('issued', 'voided');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_line_item_category" AS ENUM('service', 'labor', 'part', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_payment_reversal_status" AS ENUM('not_required', 'completed');--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "public"."vehicle_inspections_reference_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;--> statement-breakpoint
ALTER TYPE "public"."job_order_source_type" ADD VALUE 'intake' BEFORE 'back_job';--> statement-breakpoint
CREATE TABLE "job_order_invoice_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_record_id" uuid NOT NULL,
	"lineage_id" uuid NOT NULL,
	"action" "job_order_invoice_correction_action" NOT NULL,
	"from_version" integer NOT NULL,
	"to_version" integer NOT NULL,
	"idempotency_key" varchar(200) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"previous_invoice_reference" varchar(40) NOT NULL,
	"new_invoice_reference" varchar(40),
	"reason" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"before_snapshot" jsonb NOT NULL,
	"after_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_invoice_line_item_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_record_id" uuid NOT NULL,
	"invoice_version" integer NOT NULL,
	"source_job_order_item_id" uuid,
	"category" "job_order_invoice_line_item_category" NOT NULL,
	"description" varchar(240) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount_cents" integer DEFAULT 0 NOT NULL,
	"line_amount_cents" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"slot" varchar(40) DEFAULT 'general' NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(80) NOT NULL,
	"byte_size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "lineage_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "lifecycle_status" "job_order_invoice_lifecycle_status" DEFAULT 'issued' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "previous_invoice_reference" varchar(40);--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "last_voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "last_voided_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "last_void_reason" text;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "reissued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "reissued_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "payment_reversal_status" "job_order_invoice_payment_reversal_status" DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "payment_reversal_reference" varchar(120);--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "payment_reversal_reason" text;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "payment_reversal_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD COLUMN "payment_reversal_completed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD COLUMN "inspection_reference" varchar(26) DEFAULT ('INSP-' || to_char(CURRENT_TIMESTAMP, 'YYYY') || '-' || lpad(nextval('vehicle_inspections_reference_seq')::text, 6, '0')) NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD COLUMN "intake_data_version" integer;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD COLUMN "intake_data" jsonb;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_order_invoice_corrections" ADD CONSTRAINT "job_order_invoice_corrections_invoice_record_id_job_order_invoice_records_id_fk" FOREIGN KEY ("invoice_record_id") REFERENCES "public"."job_order_invoice_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_corrections" ADD CONSTRAINT "job_order_invoice_corrections_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_line_item_snapshots" ADD CONSTRAINT "job_order_invoice_line_item_snapshots_invoice_record_id_job_order_invoice_records_id_fk" FOREIGN KEY ("invoice_record_id") REFERENCES "public"."job_order_invoice_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_line_item_snapshots" ADD CONSTRAINT "job_order_invoice_line_item_snapshots_source_job_order_item_id_job_order_items_id_fk" FOREIGN KEY ("source_job_order_item_id") REFERENCES "public"."job_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_evidence" ADD CONSTRAINT "inspection_evidence_inspection_id_vehicle_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."vehicle_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_invoice_corrections_idempotency_idx" ON "job_order_invoice_corrections" USING btree ("invoice_record_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_invoice_line_items_version_sort_idx" ON "job_order_invoice_line_item_snapshots" USING btree ("invoice_record_id","invoice_version","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "inspection_evidence_storage_key_idx" ON "inspection_evidence" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "inspection_evidence_inspection_created_idx" ON "inspection_evidence" USING btree ("inspection_id","created_at");--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_last_voided_by_user_id_users_id_fk" FOREIGN KEY ("last_voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_reissued_by_user_id_users_id_fk" FOREIGN KEY ("reissued_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_payment_reversal_completed_by_user_id_users_id_fk" FOREIGN KEY ("payment_reversal_completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_inspections_reference_idx" ON "vehicle_inspections" USING btree ("inspection_reference");--> statement-breakpoint
CREATE INDEX "vehicle_inspections_vehicle_history_idx" ON "vehicle_inspections" USING btree ("vehicle_id","created_at","id");--> statement-breakpoint
CREATE INDEX "notifications_user_archived_at_idx" ON "notifications" USING btree ("user_id","archived_at");
