CREATE TYPE "public"."user_role" AS ENUM('customer', 'technician', 'head_technician', 'service_adviser', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."auth_otp_purpose" AS ENUM('customer_signup', 'staff_activation', 'account_delete', 'forgot_password', 'change_password', 'staff_phone_change');--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('google');--> statement-breakpoint
CREATE TYPE "public"."staff_admin_audit_action" AS ENUM('staff_account_provisioned', 'staff_account_status_changed');--> statement-breakpoint
CREATE TYPE "public"."analytics_refresh_job_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."analytics_refresh_trigger_source" AS ENUM('bootstrap_read', 'manual_refresh', 'integration_refresh');--> statement-breakpoint
CREATE TYPE "public"."analytics_snapshot_type" AS ENUM('dashboard', 'operations', 'back_jobs', 'loyalty', 'invoice_aging', 'audit_trail');--> statement-breakpoint
CREATE TYPE "public"."booking_reservation_payment_provider" AS ENUM('paymongo', 'manual_counter');--> statement-breakpoint
CREATE TYPE "public"."booking_reservation_payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."booking_reservation_refund_status" AS ENUM('not_required', 'pending_review', 'processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'pending_payment', 'confirmed', 'in_service', 'declined', 'rescheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."chatbot_conversation_response_type" AS ENUM('answer', 'lookup', 'escalation');--> statement-breakpoint
CREATE TYPE "public"."chatbot_escalation_status" AS ENUM('open', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."chatbot_intent_type" AS ENUM('faq', 'lookup');--> statement-breakpoint
CREATE TYPE "public"."chatbot_intent_visibility" AS ENUM('all', 'staff_only');--> statement-breakpoint
CREATE TYPE "public"."chatbot_lookup_type" AS ENUM('booking_status', 'insurance_status');--> statement-breakpoint
CREATE TYPE "public"."back_job_finding_severity" AS ENUM('info', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."back_job_status" AS ENUM('reported', 'inspected', 'approved_for_rework', 'in_progress', 'resolved', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_online_payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_payment_method" AS ENUM('cash', 'bank_transfer', 'check', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_payment_status" AS ENUM('pending_payment', 'paid');--> statement-breakpoint
CREATE TYPE "public"."job_order_invoice_settlement_channel" AS ENUM('manual', 'online_provider');--> statement-breakpoint
CREATE TYPE "public"."job_order_photo_link_type" AS ENUM('job_order', 'progress_entry', 'work_item', 'qa_review', 'workshop_stage');--> statement-breakpoint
CREATE TYPE "public"."job_order_progress_entry_type" AS ENUM('note', 'work_started', 'work_completed', 'issue_found', 'stage_update');--> statement-breakpoint
CREATE TYPE "public"."job_order_source_type" AS ENUM('booking', 'back_job');--> statement-breakpoint
CREATE TYPE "public"."job_order_status" AS ENUM('draft', 'assigned', 'in_progress', 'ready_for_qa', 'blocked', 'finalized', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_order_type" AS ENUM('normal', 'back_job');--> statement-breakpoint
CREATE TYPE "public"."job_order_workshop_stage" AS ENUM('received', 'diagnosis', 'in_repair', 'quality_check', 'ready');--> statement-breakpoint
CREATE TYPE "public"."inspection_finding_severity" AS ENUM('info', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('pending', 'completed', 'needs_followup', 'void');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('intake', 'pre_repair', 'completion', 'return');--> statement-breakpoint
CREATE TYPE "public"."insurance_case_purpose" AS ENUM('new_application', 'renewal', 'claim', 'quotation');--> statement-breakpoint
CREATE TYPE "public"."insurance_document_review_status" AS ENUM('complete', 'incomplete', 'under_verification', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."insurance_document_type" AS ENUM('or_cr', 'policy', 'valid_id', 'police_report', 'photo', 'estimate', 'proof_of_payment', 'other');--> statement-breakpoint
CREATE TYPE "public"."insurance_inquiry_status" AS ENUM('submitted', 'needs_documents', 'under_review', 'for_approval', 'approved', 'payment_pending', 'active', 'for_renewal', 'rejected', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."insurance_inquiry_type" AS ENUM('ctpl', 'comprehensive');--> statement-breakpoint
CREATE TYPE "public"."insurance_payment_status" AS ENUM('not_required', 'unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."insurance_renewal_status" AS ENUM('not_applicable', 'upcoming', 'quote_preparing', 'quoted', 'awaiting_customer', 'renewed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_attempt_status" AS ENUM('sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('booking_reminder', 'booking_payment', 'insurance_update', 'back_job_update', 'invoice_aging', 'invoice_document', 'qa_review', 'service_follow_up', 'auth_otp');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_source_type" AS ENUM('booking', 'booking_payment', 'insurance_inquiry', 'back_job', 'invoice_payment', 'invoice_document', 'job_order', 'service_follow_up', 'auth');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed', 'skipped', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reminder_rule_status" AS ENUM('scheduled', 'cancelled', 'processed');--> statement-breakpoint
CREATE TYPE "public"."earning_rule_accrual_source" AS ENUM('service', 'ecommerce', 'both');--> statement-breakpoint
CREATE TYPE "public"."earning_rule_audit_action" AS ENUM('created', 'updated', 'activated', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."earning_rule_formula_type" AS ENUM('flat_points', 'amount_ratio');--> statement-breakpoint
CREATE TYPE "public"."earning_rule_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."loyalty_source_type" AS ENUM('service_payment', 'service_invoice', 'purchase_payment', 'reward_redemption', 'manual_adjustment', 'service_reversal', 'purchase_reversal');--> statement-breakpoint
CREATE TYPE "public"."loyalty_transaction_type" AS ENUM('accrual', 'redemption', 'adjustment', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."reward_catalog_audit_action" AS ENUM('created', 'updated', 'activated', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."reward_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('service_voucher', 'discount_coupon');--> statement-breakpoint
CREATE TYPE "public"."vehicle_lifecycle_summary_status" AS ENUM('queued', 'generating', 'generation_failed', 'pending_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."vehicle_timeline_event_category" AS ENUM('administrative', 'verified');--> statement-breakpoint
CREATE TYPE "public"."vehicle_timeline_source_type" AS ENUM('booking', 'inspection', 'job_order', 'quality_gate', 'lifecycle_summary', 'manual');--> statement-breakpoint
CREATE TYPE "public"."quality_gate_finding_gate" AS ENUM('foundation', 'gate_1', 'gate_2');--> statement-breakpoint
CREATE TYPE "public"."quality_gate_finding_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."quality_gate_reviewer_verdict" AS ENUM('pending', 'passed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."quality_gate_status" AS ENUM('pending_review', 'passed', 'blocked', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."quality_pre_check_status" AS ENUM('pending', 'completed', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."staff_queue_session_status" AS ENUM('available', 'paused');--> statement-breakpoint
CREATE TYPE "public"."staff_work_claim_status" AS ENUM('active', 'completed', 'released', 'expired', 'reassigned');--> statement-breakpoint
CREATE TYPE "public"."staff_work_entity_type" AS ENUM('booking_handoff', 'job_order');--> statement-breakpoint
CREATE TYPE "public"."staff_work_queue_type" AS ENUM('job_order', 'qa');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(80),
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" varchar(120) NOT NULL,
	"province" varchar(120) NOT NULL,
	"postal_code" varchar(20),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"phone" varchar(30),
	"birthday" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"deleted_email" varchar(255),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"staff_code" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_staff_code_unique" UNIQUE("staff_code")
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "auth_google_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" DEFAULT 'google' NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_google_identities_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "auth_google_identities_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "auth_otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_otp_purpose" NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"ip_address" varchar(64),
	"was_successful" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "staff_admin_audit_action" NOT NULL,
	"actor_user_id" uuid,
	"actor_role" "user_role" NOT NULL,
	"target_user_id" uuid,
	"target_role" "user_role" NOT NULL,
	"target_email" varchar(255) NOT NULL,
	"target_staff_code" varchar(40),
	"previous_is_active" boolean,
	"next_is_active" boolean,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_refresh_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trigger_source" "analytics_refresh_trigger_source" NOT NULL,
	"requested_by_user_id" uuid,
	"status" "analytics_refresh_job_status" DEFAULT 'processing' NOT NULL,
	"source_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_type" "analytics_snapshot_type" NOT NULL,
	"version" varchar(32) DEFAULT 'v1' NOT NULL,
	"payload" jsonb NOT NULL,
	"source_counts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"refresh_job_id" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plate_number" varchar(20) NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"color" varchar(50),
	"vin" varchar(64),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
CREATE TABLE "booking_date_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_date" date NOT NULL,
	"label" varchar(120),
	"reason" text NOT NULL,
	"is_closed" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_payment_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_fee_amount_cents" integer DEFAULT 50000 NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"online_expiry_window_minutes" integer DEFAULT 30 NOT NULL,
	"counter_expiry_window_minutes" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_reservation_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" "booking_reservation_payment_provider" DEFAULT 'paymongo' NOT NULL,
	"status" "booking_reservation_payment_status" DEFAULT 'pending' NOT NULL,
	"refund_status" "booking_reservation_refund_status" DEFAULT 'not_required' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"provider_payment_id" varchar(255),
	"provider_checkout_url" text,
	"reference_number" varchar(120),
	"failure_reason" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"confirmed_by_user_id" uuid,
	"audit_metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"previous_status" "booking_status",
	"next_status" "booking_status" NOT NULL,
	"reason" text,
	"changed_by_user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_reference" varchar(40),
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"time_slot_id" uuid NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"notes" text,
	"qr_code_token" varchar(120),
	"qr_code_issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid,
	"name" varchar(120) NOT NULL,
	"description" text,
	"base_price_cents" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(120) NOT NULL,
	"start_time" varchar(10) NOT NULL,
	"end_time" varchar(10) NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"intent_id" uuid,
	"prompt" text NOT NULL,
	"response_type" "chatbot_conversation_response_type" NOT NULL,
	"response_text" text NOT NULL,
	"lookup_payload" jsonb DEFAULT 'null'::jsonb,
	"escalation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"intent_id" uuid,
	"prompt" text NOT NULL,
	"reason" varchar(120) NOT NULL,
	"status" "chatbot_escalation_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chatbot_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_key" varchar(120) NOT NULL,
	"label" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"intent_type" "chatbot_intent_type" NOT NULL,
	"response_template" text NOT NULL,
	"lookup_type" "chatbot_lookup_type",
	"visibility" "chatbot_intent_visibility" DEFAULT 'all' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_intents_intent_key_unique" UNIQUE("intent_key")
);
--> statement-breakpoint
CREATE TABLE "chatbot_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_key" varchar(140) NOT NULL,
	"intent_id" uuid NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chatbot_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
CREATE TABLE "back_job_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"back_job_id" uuid NOT NULL,
	"category" varchar(120) NOT NULL,
	"label" varchar(160) NOT NULL,
	"severity" "back_job_finding_severity" DEFAULT 'info' NOT NULL,
	"notes" text,
	"is_validated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "back_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"original_booking_id" uuid,
	"original_job_order_id" uuid NOT NULL,
	"return_inspection_id" uuid,
	"rework_job_order_id" uuid,
	"complaint" text NOT NULL,
	"status" "back_job_status" DEFAULT 'reported' NOT NULL,
	"review_notes" text,
	"resolution_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"technician_user_id" uuid,
	"technician_profile_id" uuid,
	"technician_code" varchar(40),
	"technician_name" varchar(160),
	"selected_specialty" varchar(120),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_invoice_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"invoice_reference" varchar(40) NOT NULL,
	"source_type" "job_order_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"service_adviser_user_id" uuid NOT NULL,
	"service_adviser_code" varchar(40) NOT NULL,
	"finalized_by_user_id" uuid NOT NULL,
	"payment_status" "job_order_invoice_payment_status" DEFAULT 'pending_payment' NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"subtotal_amount_cents" integer DEFAULT 0 NOT NULL,
	"labor_amount_cents" integer DEFAULT 0 NOT NULL,
	"parts_amount_cents" integer DEFAULT 0 NOT NULL,
	"reservation_fee_deduction_cents" integer DEFAULT 0 NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"amount_paid_cents" integer,
	"payment_method" "job_order_invoice_payment_method",
	"payment_channel" "job_order_invoice_settlement_channel",
	"payment_reference" varchar(120),
	"official_receipt_reference" varchar(40) NOT NULL,
	"online_payment_provider" varchar(40),
	"online_payment_status" "job_order_invoice_online_payment_status",
	"online_payment_session_id" varchar(120),
	"online_payment_checkout_url" text,
	"online_payment_reference" varchar(120),
	"online_payment_paid_at" timestamp with time zone,
	"online_payment_failure_reason" text,
	"paid_at" timestamp with time zone,
	"recorded_by_user_id" uuid,
	"summary" text,
	"pdf_generated_at" timestamp with time zone,
	"pdf_email_sent_at" timestamp with time zone,
	"pdf_email_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"estimated_hours" integer,
	"requires_photo_evidence" boolean DEFAULT true NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"taken_by_user_id" uuid NOT NULL,
	"linked_entity_type" "job_order_photo_link_type" DEFAULT 'job_order' NOT NULL,
	"linked_entity_id" uuid,
	"storage_key" varchar(255) NOT NULL,
	"mime_type" varchar(120) DEFAULT 'image/jpeg' NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"caption" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_order_progress_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"technician_user_id" uuid,
	"recorded_by_user_id" uuid,
	"technician_profile_id" uuid,
	"workshop_stage" "job_order_workshop_stage",
	"work_item_id" uuid,
	"entry_type" "job_order_progress_entry_type" NOT NULL,
	"message" text NOT NULL,
	"completed_item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attached_photo_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "job_order_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"job_type" "job_order_type" DEFAULT 'normal' NOT NULL,
	"parent_job_order_id" uuid,
	"customer_user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"service_adviser_user_id" uuid NOT NULL,
	"service_adviser_code" varchar(40) NOT NULL,
	"status" "job_order_status" DEFAULT 'draft' NOT NULL,
	"current_workshop_stage" "job_order_workshop_stage",
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"category" varchar(120) NOT NULL,
	"label" varchar(160) NOT NULL,
	"severity" "inspection_finding_severity" DEFAULT 'info' NOT NULL,
	"notes" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"booking_id" uuid,
	"inspection_type" "inspection_type" NOT NULL,
	"status" "inspection_status" DEFAULT 'pending' NOT NULL,
	"inspector_user_id" uuid,
	"notes" text,
	"attachment_refs" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"document_type" "insurance_document_type" NOT NULL,
	"notes" text,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"inquiry_type" "insurance_inquiry_type" NOT NULL,
	"purpose" "insurance_case_purpose" DEFAULT 'quotation' NOT NULL,
	"subject" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"provider_name" varchar(180),
	"policy_number" varchar(120),
	"notes" text,
	"status" "insurance_inquiry_status" DEFAULT 'submitted' NOT NULL,
	"document_status" "insurance_document_review_status" DEFAULT 'incomplete' NOT NULL,
	"payment_status" "insurance_payment_status" DEFAULT 'not_required' NOT NULL,
	"renewal_status" "insurance_renewal_status" DEFAULT 'not_applicable' NOT NULL,
	"assigned_staff_id" uuid,
	"payment_due_at" timestamp with time zone,
	"policy_expiry_at" timestamp with time zone,
	"renewal_due_at" timestamp with time zone,
	"review_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"inquiry_type" "insurance_inquiry_type" NOT NULL,
	"provider_name" varchar(180),
	"policy_number" varchar(120),
	"status" "insurance_inquiry_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"actor_user_id" uuid,
	"document_type" "insurance_document_type",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "notification_attempt_status" NOT NULL,
	"provider_message_id" varchar(255),
	"error_message" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"booking_reminders_enabled" boolean DEFAULT true NOT NULL,
	"insurance_updates_enabled" boolean DEFAULT true NOT NULL,
	"invoice_reminders_enabled" boolean DEFAULT true NOT NULL,
	"service_follow_up_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "notification_category" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"source_type" "notification_source_type" NOT NULL,
	"source_id" varchar(120) NOT NULL,
	"title" varchar(180) NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"scheduled_for" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_type" "notification_category" NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"source_type" "notification_source_type" NOT NULL,
	"source_id" varchar(120) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" "reminder_rule_status" DEFAULT 'scheduled' NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_points_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_points_redeemed" integer DEFAULT 0 NOT NULL,
	"last_accrued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_earning_rule_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"earning_rule_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" "earning_rule_audit_action" NOT NULL,
	"reason" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_earning_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"accrual_source" "earning_rule_accrual_source" DEFAULT 'service' NOT NULL,
	"formula_type" "earning_rule_formula_type" NOT NULL,
	"flat_points" integer,
	"amount_step_cents" integer,
	"points_per_step" integer,
	"minimum_amount_cents" integer,
	"eligible_service_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligible_service_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligible_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"eligible_product_category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"promo_label" varchar(160),
	"manual_benefit_note" text,
	"active_from" timestamp with time zone,
	"active_until" timestamp with time zone,
	"status" "earning_rule_status" DEFAULT 'inactive' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loyalty_account_id" uuid NOT NULL,
	"transaction_type" "loyalty_transaction_type" NOT NULL,
	"source_type" "loyalty_source_type" NOT NULL,
	"source_reference" varchar(200) NOT NULL,
	"idempotency_key" varchar(220),
	"policy_key" varchar(120),
	"points_delta" integer NOT NULL,
	"resulting_balance" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "reward_catalog_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" "reward_catalog_audit_action" NOT NULL,
	"reason" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loyalty_account_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"redeemed_by_user_id" uuid NOT NULL,
	"reward_name_snapshot" varchar(160) NOT NULL,
	"points_cost_snapshot" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_redemptions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"fulfillment_note" text,
	"reward_type" "reward_type" NOT NULL,
	"points_cost" integer NOT NULL,
	"discount_percent" integer,
	"status" "reward_status" DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_lifecycle_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"summary_text" text NOT NULL,
	"status" "vehicle_lifecycle_summary_status" DEFAULT 'pending_review' NOT NULL,
	"customer_visible" boolean DEFAULT false NOT NULL,
	"customer_visible_at" timestamp with time zone,
	"review_notes" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"generation_job" jsonb,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"event_category" "vehicle_timeline_event_category" NOT NULL,
	"source_type" "vehicle_timeline_source_type" NOT NULL,
	"source_id" varchar(120) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"inspection_id" uuid,
	"actor_user_id" uuid,
	"notes" text,
	"dedupe_key" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_timeline_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "job_order_quality_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_order_id" uuid NOT NULL,
	"status" "quality_gate_status" DEFAULT 'pending_review' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"blocking_reason" text,
	"pre_check_status" "quality_pre_check_status" DEFAULT 'pending' NOT NULL,
	"pre_check_summary" jsonb,
	"head_technician_user_id" uuid,
	"reviewer_verdict" "quality_gate_reviewer_verdict" DEFAULT 'pending' NOT NULL,
	"reviewer_note" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"audit_job" jsonb,
	"last_audit_requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_audit_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_gate_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quality_gate_id" uuid NOT NULL,
	"gate" "quality_gate_finding_gate" DEFAULT 'foundation' NOT NULL,
	"severity" "quality_gate_finding_severity" DEFAULT 'warning' NOT NULL,
	"code" varchar(80) NOT NULL,
	"message" text NOT NULL,
	"provenance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_gate_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quality_gate_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technician_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"specialties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"phone" varchar(32),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"migrated_from_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technician_profiles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "staff_queue_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"queue_type" "staff_work_queue_type" NOT NULL,
	"status" "staff_queue_session_status" DEFAULT 'paused' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_assigned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_work_claims" (
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
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"sku" varchar(80) NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_google_identities" ADD CONSTRAINT "auth_google_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_otp_challenges" ADD CONSTRAINT "auth_otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_audit_logs" ADD CONSTRAINT "login_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_admin_audit_logs" ADD CONSTRAINT "staff_admin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_admin_audit_logs" ADD CONSTRAINT "staff_admin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_refresh_jobs" ADD CONSTRAINT "analytics_refresh_jobs_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_refresh_job_id_analytics_refresh_jobs_id_fk" FOREIGN KEY ("refresh_job_id") REFERENCES "public"."analytics_refresh_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_date_closures" ADD CONSTRAINT "booking_date_closures_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_date_closures" ADD CONSTRAINT "booking_date_closures_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reservation_payments" ADD CONSTRAINT "booking_reservation_payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reservation_payments" ADD CONSTRAINT "booking_reservation_payments_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_slot_id_time_slots_id_fk" FOREIGN KEY ("time_slot_id") REFERENCES "public"."time_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_intent_id_chatbot_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."chatbot_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD CONSTRAINT "chatbot_conversations_escalation_id_chatbot_escalations_id_fk" FOREIGN KEY ("escalation_id") REFERENCES "public"."chatbot_escalations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_escalations" ADD CONSTRAINT "chatbot_escalations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_escalations" ADD CONSTRAINT "chatbot_escalations_intent_id_chatbot_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."chatbot_intents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chatbot_rules" ADD CONSTRAINT "chatbot_rules_intent_id_chatbot_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."chatbot_intents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_job_findings" ADD CONSTRAINT "back_job_findings_back_job_id_back_jobs_id_fk" FOREIGN KEY ("back_job_id") REFERENCES "public"."back_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_original_booking_id_bookings_id_fk" FOREIGN KEY ("original_booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_original_job_order_id_job_orders_id_fk" FOREIGN KEY ("original_job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_return_inspection_id_vehicle_inspections_id_fk" FOREIGN KEY ("return_inspection_id") REFERENCES "public"."vehicle_inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_rework_job_order_id_job_orders_id_fk" FOREIGN KEY ("rework_job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "back_jobs" ADD CONSTRAINT "back_jobs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_assignments" ADD CONSTRAINT "job_order_assignments_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_assignments" ADD CONSTRAINT "job_order_assignments_technician_user_id_users_id_fk" FOREIGN KEY ("technician_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_assignments" ADD CONSTRAINT "job_order_assignments_technician_profile_id_technician_profiles_id_fk" FOREIGN KEY ("technician_profile_id") REFERENCES "public"."technician_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_service_adviser_user_id_users_id_fk" FOREIGN KEY ("service_adviser_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_finalized_by_user_id_users_id_fk" FOREIGN KEY ("finalized_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_invoice_records" ADD CONSTRAINT "job_order_invoice_records_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_items" ADD CONSTRAINT "job_order_items_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_photos" ADD CONSTRAINT "job_order_photos_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_photos" ADD CONSTRAINT "job_order_photos_taken_by_user_id_users_id_fk" FOREIGN KEY ("taken_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_progress_logs" ADD CONSTRAINT "job_order_progress_logs_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_progress_logs" ADD CONSTRAINT "job_order_progress_logs_technician_user_id_users_id_fk" FOREIGN KEY ("technician_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_progress_logs" ADD CONSTRAINT "job_order_progress_logs_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_progress_logs" ADD CONSTRAINT "job_order_progress_logs_technician_profile_id_technician_profiles_id_fk" FOREIGN KEY ("technician_profile_id") REFERENCES "public"."technician_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_progress_logs" ADD CONSTRAINT "job_order_progress_logs_work_item_id_job_order_items_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."job_order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_customer_user_id_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_service_adviser_user_id_users_id_fk" FOREIGN KEY ("service_adviser_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_orders" ADD CONSTRAINT "job_orders_parent_job_order_id_fkey" FOREIGN KEY ("parent_job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_findings" ADD CONSTRAINT "inspection_findings_inspection_id_vehicle_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."vehicle_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_documents" ADD CONSTRAINT "insurance_documents_inquiry_id_insurance_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."insurance_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_documents" ADD CONSTRAINT "insurance_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD CONSTRAINT "insurance_inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD CONSTRAINT "insurance_inquiries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD CONSTRAINT "insurance_inquiries_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD CONSTRAINT "insurance_inquiries_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD CONSTRAINT "insurance_inquiries_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_records" ADD CONSTRAINT "insurance_records_inquiry_id_insurance_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."insurance_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_records" ADD CONSTRAINT "insurance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_records" ADD CONSTRAINT "insurance_records_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_activities" ADD CONSTRAINT "insurance_activities_inquiry_id_insurance_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."insurance_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_activities" ADD CONSTRAINT "insurance_activities_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_earning_rule_audits" ADD CONSTRAINT "loyalty_earning_rule_audits_earning_rule_id_loyalty_earning_rules_id_fk" FOREIGN KEY ("earning_rule_id") REFERENCES "public"."loyalty_earning_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_earning_rule_audits" ADD CONSTRAINT "loyalty_earning_rule_audits_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_earning_rules" ADD CONSTRAINT "loyalty_earning_rules_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_earning_rules" ADD CONSTRAINT "loyalty_earning_rules_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_loyalty_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("loyalty_account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_catalog_audits" ADD CONSTRAINT "reward_catalog_audits_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_catalog_audits" ADD CONSTRAINT "reward_catalog_audits_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_loyalty_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("loyalty_account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_transaction_id_loyalty_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."loyalty_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_redeemed_by_user_id_users_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_lifecycle_summaries" ADD CONSTRAINT "vehicle_lifecycle_summaries_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_lifecycle_summaries" ADD CONSTRAINT "vehicle_lifecycle_summaries_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_lifecycle_summaries" ADD CONSTRAINT "vehicle_lifecycle_summaries_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_timeline_events" ADD CONSTRAINT "vehicle_timeline_events_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_timeline_events" ADD CONSTRAINT "vehicle_timeline_events_inspection_id_vehicle_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."vehicle_inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_quality_gates" ADD CONSTRAINT "job_order_quality_gates_job_order_id_job_orders_id_fk" FOREIGN KEY ("job_order_id") REFERENCES "public"."job_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_order_quality_gates" ADD CONSTRAINT "job_order_quality_gates_head_technician_user_id_users_id_fk" FOREIGN KEY ("head_technician_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_findings" ADD CONSTRAINT "quality_gate_findings_quality_gate_id_job_order_quality_gates_id_fk" FOREIGN KEY ("quality_gate_id") REFERENCES "public"."job_order_quality_gates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_overrides" ADD CONSTRAINT "quality_gate_overrides_quality_gate_id_job_order_quality_gates_id_fk" FOREIGN KEY ("quality_gate_id") REFERENCES "public"."job_order_quality_gates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_overrides" ADD CONSTRAINT "quality_gate_overrides_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_migrated_from_user_id_users_id_fk" FOREIGN KEY ("migrated_from_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_queue_sessions" ADD CONSTRAINT "staff_queue_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_work_claims" ADD CONSTRAINT "staff_work_claims_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_snapshots_snapshot_type_idx" ON "analytics_snapshots" USING btree ("snapshot_type");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_date_closures_scheduled_date_idx" ON "booking_date_closures" USING btree ("scheduled_date");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_reservation_payments_booking_id_idx" ON "booking_reservation_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_services_booking_id_service_id_idx" ON "booking_services" USING btree ("booking_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_booking_reference_idx" ON "bookings" USING btree ("booking_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_assignments_job_order_id_technician_profile_id_idx" ON "job_order_assignments" USING btree ("job_order_id","technician_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_invoice_records_job_order_id_idx" ON "job_order_invoice_records" USING btree ("job_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_invoice_records_invoice_reference_idx" ON "job_order_invoice_records" USING btree ("invoice_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "job_orders_source_type_source_id_idx" ON "job_orders" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_records_inquiry_id_idx" ON "insurance_records" USING btree ("inquiry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_rules_dedupe_key_idx" ON "reminder_rules" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_order_quality_gates_job_order_id_idx" ON "job_order_quality_gates" USING btree ("job_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_queue_sessions_user_queue_idx" ON "staff_queue_sessions" USING btree ("user_id","queue_type");--> statement-breakpoint
CREATE INDEX "staff_queue_sessions_dispatch_order_idx" ON "staff_queue_sessions" USING btree ("queue_type","status","last_assigned_at","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_work_claims_active_entity_idx" ON "staff_work_claims" USING btree ("queue_type","entity_type","entity_id") WHERE "staff_work_claims"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "staff_work_claims_active_owner_queue_idx" ON "staff_work_claims" USING btree ("queue_type","owner_user_id") WHERE "staff_work_claims"."status" = 'active';--> statement-breakpoint
CREATE INDEX "staff_work_claims_queue_status_lease_idx" ON "staff_work_claims" USING btree ("queue_type","status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "staff_work_claims_entity_history_idx" ON "staff_work_claims" USING btree ("entity_type","entity_id","created_at");