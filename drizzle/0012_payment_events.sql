CREATE TYPE "commerce_admin"."payment_event_status" AS ENUM('paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TABLE "commerce_admin"."payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "commerce_admin"."payment_event_status" NOT NULL,
	"amount_minor" integer NOT NULL,
	"occurred_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"method" text,
	"external_id" text,
	CONSTRAINT "payment_events_source_status_external_id_unique" UNIQUE("source","status","external_id"),
	CONSTRAINT "payment_events_nonnegative_amount" CHECK ("commerce_admin"."payment_events"."amount_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_events_order_id_recorded_at_id_index" ON "commerce_admin"."payment_events" USING btree ("order_id","recorded_at","id");--> statement-breakpoint
CREATE INDEX "payment_events_status_occurred_at_index" ON "commerce_admin"."payment_events" USING btree ("status","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_one_paid_order" ON "commerce_admin"."payment_events" USING btree ("order_id") WHERE "commerce_admin"."payment_events"."status" = 'paid';
--> statement-breakpoint
INSERT INTO "commerce_admin"."payment_events" ("order_id", "status", "amount_minor", "occurred_at", "source")
SELECT "id", 'paid', "total_minor", "paid_at", 'legacy'
FROM "commerce_admin"."orders" WHERE "payment_status" IN ('paid', 'refunded');
--> statement-breakpoint
INSERT INTO "commerce_admin"."payment_events" ("order_id", "status", "amount_minor", "source")
SELECT "id", 'refunded', "total_minor", 'legacy'
FROM "commerce_admin"."orders" WHERE "payment_status" = 'refunded';
