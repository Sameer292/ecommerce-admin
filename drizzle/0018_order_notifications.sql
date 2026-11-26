CREATE TYPE "commerce_admin"."notification_kind" AS ENUM('shipping', 'cancellation', 'refund');--> statement-breakpoint
CREATE TYPE "commerce_admin"."notification_status" AS ENUM('pending', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "commerce_admin"."order_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" "commerce_admin"."notification_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "commerce_admin"."notification_status" DEFAULT 'pending' NOT NULL,
	"claim_id" uuid,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_notifications" ADD CONSTRAINT "order_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_notifications_order_id_created_at_index" ON "commerce_admin"."order_notifications" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_notifications_status_created_at_index" ON "commerce_admin"."order_notifications" USING btree ("status","created_at");