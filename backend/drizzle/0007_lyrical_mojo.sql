CREATE TYPE "public"."user_identity_kind" AS ENUM('registered', 'walk_in');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "contact_consent_acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "identity_kind" "user_identity_kind" DEFAULT 'registered' NOT NULL;