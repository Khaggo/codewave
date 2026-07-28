ALTER TABLE "insurance_inquiries" ADD COLUMN "client_request_id" uuid;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD COLUMN "incident_occurred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "insurance_inquiries" ADD COLUMN "incident_location" varchar(255);--> statement-breakpoint
ALTER TABLE "insurance_activities" ADD COLUMN "customer_message" text;--> statement-breakpoint
CREATE UNIQUE INDEX "insurance_inquiries_user_client_request_idx" ON "insurance_inquiries" USING btree ("user_id","client_request_id");