CREATE TYPE "public"."vehicle_sticker_observation" AS ENUM('verified_present', 'not_present');--> statement-breakpoint
CREATE TABLE "vehicle_sticker_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"inspection_id" uuid NOT NULL,
	"intake_reference" varchar(40) NOT NULL,
	"observation" "vehicle_sticker_observation" NOT NULL,
	"verified_by_user_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"reason" varchar(240),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_sticker_observations" ADD CONSTRAINT "vehicle_sticker_observations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_sticker_observations" ADD CONSTRAINT "vehicle_sticker_observations_inspection_id_vehicle_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."vehicle_inspections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_sticker_observations" ADD CONSTRAINT "vehicle_sticker_observations_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_sticker_observations_inspection_idx" ON "vehicle_sticker_observations" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "vehicle_sticker_observations_vehicle_latest_idx" ON "vehicle_sticker_observations" USING btree ("vehicle_id","observed_at","id");