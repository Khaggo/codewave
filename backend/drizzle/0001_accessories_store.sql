CREATE TYPE "public"."accessory_fitment_status" AS ENUM('universal', 'compatible', 'incompatible', 'unverified');--> statement-breakpoint
CREATE TYPE "public"."accessory_inventory_movement_type" AS ENUM('stock_in', 'adjustment', 'reservation', 'reservation_release', 'sale', 'refund_return');--> statement-breakpoint
CREATE TYPE "public"."accessory_order_status" AS ENUM('pending_payment', 'reserved', 'paid', 'preparing', 'ready_for_pickup', 'collected', 'cancelled', 'expired', 'payment_exception', 'refund_pending', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."accessory_outbox_status" AS ENUM('pending', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."accessory_payment_method" AS ENUM('paymongo', 'pay_at_shop');--> statement-breakpoint
CREATE TYPE "public"."accessory_payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'cancelled', 'refund_pending', 'refunded', 'exception');--> statement-breakpoint
CREATE TYPE "public"."accessory_publication_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."accessory_refund_status" AS ENUM('requested', 'processing', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."accessory_reservation_status" AS ENUM('active', 'consumed', 'released', 'expired');--> statement-breakpoint
CREATE TABLE "accessory_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_cart_items_quantity_positive" CHECK ("accessory_cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "accessory_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_vehicle_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_catalog_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(80) NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "accessory_publication_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_fitment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"status" "accessory_fitment_status" NOT NULL,
	"make" varchar(120),
	"model" varchar(120),
	"year_from" integer,
	"year_to" integer,
	"note" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_fulfillment_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"previous_status" "accessory_order_status",
	"next_status" "accessory_order_status" NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"scope" varchar(100) NOT NULL,
	"key" varchar(200) NOT NULL,
	"payload_fingerprint" varchar(64) NOT NULL,
	"resource_type" varchar(80),
	"resource_id" uuid,
	"response_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_inventory_balances" (
	"variant_id" uuid PRIMARY KEY NOT NULL,
	"on_hand_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_inventory_balances_nonnegative" CHECK ("accessory_inventory_balances"."on_hand_quantity" >= 0 AND "accessory_inventory_balances"."reserved_quantity" >= 0 AND "accessory_inventory_balances"."reserved_quantity" <= "accessory_inventory_balances"."on_hand_quantity")
);
--> statement-breakpoint
CREATE TABLE "accessory_inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"movement_type" "accessory_inventory_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"resulting_on_hand" integer NOT NULL,
	"resulting_reserved" integer NOT NULL,
	"source_type" varchar(80) NOT NULL,
	"source_id" varchar(160) NOT NULL,
	"actor_user_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "accessory_reservation_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"sku_snapshot" varchar(100) NOT NULL,
	"product_name_snapshot" varchar(200) NOT NULL,
	"variant_name_snapshot" varchar(160) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"fitment_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_reference" varchar(40) NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_vehicle_id" uuid,
	"status" "accessory_order_status" NOT NULL,
	"payment_method" "accessory_payment_method" NOT NULL,
	"payment_status" "accessory_payment_status" DEFAULT 'pending' NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"contact_snapshot" jsonb NOT NULL,
	"vehicle_snapshot" jsonb,
	"reservation_expires_at" timestamp with time zone,
	"assigned_to_user_id" uuid,
	"pickup_code_hash" varchar(64),
	"pickup_code_attempts" integer DEFAULT 0 NOT NULL,
	"pickup_code_locked_until" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"prepared_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"collected_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_orders_totals_nonnegative" CHECK ("accessory_orders"."subtotal_cents" >= 0 AND "accessory_orders"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "accessory_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "accessory_outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "accessory_payment_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"provider_checkout_id" varchar(255),
	"provider_payment_id" varchar(255),
	"checkout_url" text,
	"failure_reason" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"order_id" uuid,
	"livemode" boolean NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_payment_events_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "accessory_product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"public_url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" integer NOT NULL,
	"alt_text" varchar(240) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" varchar(180) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"status" "accessory_publication_status" DEFAULT 'draft' NOT NULL,
	"is_lighting" boolean DEFAULT false NOT NULL,
	"compatibility_reviewed_at" timestamp with time zone,
	"compatibility_reviewed_by_user_id" uuid,
	"compliance_reviewed_at" timestamp with time zone,
	"compliance_reviewed_by_user_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "accessory_refund_status" DEFAULT 'requested' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"reason" text NOT NULL,
	"requested_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"provider_refund_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accessory_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"price_cents" integer NOT NULL,
	"currency_code" varchar(8) DEFAULT 'PHP' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accessory_variants_price_nonnegative" CHECK ("accessory_variants"."price_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "accessory_cart_items" ADD CONSTRAINT "accessory_cart_items_cart_id_accessory_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."accessory_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_cart_items" ADD CONSTRAINT "accessory_cart_items_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_carts" ADD CONSTRAINT "accessory_carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_carts" ADD CONSTRAINT "accessory_carts_selected_vehicle_id_vehicles_id_fk" FOREIGN KEY ("selected_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_catalog_audits" ADD CONSTRAINT "accessory_catalog_audits_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_categories" ADD CONSTRAINT "accessory_categories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_categories" ADD CONSTRAINT "accessory_categories_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_fitment_rules" ADD CONSTRAINT "accessory_fitment_rules_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_fitment_rules" ADD CONSTRAINT "accessory_fitment_rules_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_fulfillment_history" ADD CONSTRAINT "accessory_fulfillment_history_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_fulfillment_history" ADD CONSTRAINT "accessory_fulfillment_history_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_idempotency_records" ADD CONSTRAINT "accessory_idempotency_records_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_inventory_balances" ADD CONSTRAINT "accessory_inventory_balances_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_inventory_movements" ADD CONSTRAINT "accessory_inventory_movements_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_inventory_movements" ADD CONSTRAINT "accessory_inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_inventory_reservations" ADD CONSTRAINT "accessory_inventory_reservations_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_inventory_reservations" ADD CONSTRAINT "accessory_inventory_reservations_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_order_items" ADD CONSTRAINT "accessory_order_items_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_order_items" ADD CONSTRAINT "accessory_order_items_variant_id_accessory_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."accessory_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_orders" ADD CONSTRAINT "accessory_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_orders" ADD CONSTRAINT "accessory_orders_selected_vehicle_id_vehicles_id_fk" FOREIGN KEY ("selected_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_orders" ADD CONSTRAINT "accessory_orders_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_payment_attempts" ADD CONSTRAINT "accessory_payment_attempts_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_payment_events" ADD CONSTRAINT "accessory_payment_events_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_product_media" ADD CONSTRAINT "accessory_product_media_product_id_accessory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."accessory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_products" ADD CONSTRAINT "accessory_products_category_id_accessory_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."accessory_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_products" ADD CONSTRAINT "accessory_products_compatibility_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("compatibility_reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_products" ADD CONSTRAINT "accessory_products_compliance_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("compliance_reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_products" ADD CONSTRAINT "accessory_products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_products" ADD CONSTRAINT "accessory_products_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_refunds" ADD CONSTRAINT "accessory_refunds_order_id_accessory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."accessory_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_refunds" ADD CONSTRAINT "accessory_refunds_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_refunds" ADD CONSTRAINT "accessory_refunds_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_variants" ADD CONSTRAINT "accessory_variants_product_id_accessory_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."accessory_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_cart_items_cart_variant_idx" ON "accessory_cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_carts_active_user_idx" ON "accessory_carts" USING btree ("user_id") WHERE "accessory_carts"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_categories_slug_idx" ON "accessory_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "accessory_categories_status_order_idx" ON "accessory_categories" USING btree ("status","display_order");--> statement-breakpoint
CREATE INDEX "accessory_fitment_rules_variant_idx" ON "accessory_fitment_rules" USING btree ("variant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_idempotency_actor_scope_key_idx" ON "accessory_idempotency_records" USING btree ("actor_user_id","scope","key");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_reservations_order_variant_idx" ON "accessory_inventory_reservations" USING btree ("order_id","variant_id");--> statement-breakpoint
CREATE INDEX "accessory_reservations_expiry_idx" ON "accessory_inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_orders_reference_idx" ON "accessory_orders" USING btree ("order_reference");--> statement-breakpoint
CREATE INDEX "accessory_orders_owner_created_idx" ON "accessory_orders" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "accessory_orders_status_created_idx" ON "accessory_orders" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "accessory_outbox_pending_idx" ON "accessory_outbox" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "accessory_payment_attempts_order_idx" ON "accessory_payment_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_product_media_order_idx" ON "accessory_product_media" USING btree ("product_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_product_media_storage_key_idx" ON "accessory_product_media" USING btree ("storage_key");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_products_slug_idx" ON "accessory_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "accessory_products_category_status_idx" ON "accessory_products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "accessory_products_created_idx" ON "accessory_products" USING btree ("created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_refunds_active_order_idx" ON "accessory_refunds" USING btree ("order_id") WHERE "accessory_refunds"."status" IN ('requested', 'processing');--> statement-breakpoint
CREATE UNIQUE INDEX "accessory_variants_sku_idx" ON "accessory_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "accessory_variants_product_idx" ON "accessory_variants" USING btree ("product_id","is_active");