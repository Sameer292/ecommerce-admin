CREATE TYPE "commerce_admin"."order_return_status" AS ENUM('requested', 'approved', 'received', 'rejected', 'refunded');--> statement-breakpoint
CREATE TABLE "commerce_admin"."order_returns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "commerce_admin"."order_return_status" DEFAULT 'requested' NOT NULL,
	"restocked" boolean DEFAULT false NOT NULL,
	"requested_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_returns_positive_quantity" CHECK ("commerce_admin"."order_returns"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."payment_events" ADD COLUMN "return_id" uuid;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_returns" ADD CONSTRAINT "order_returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_returns" ADD CONSTRAINT "order_returns_item_id_order_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "commerce_admin"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_returns" ADD CONSTRAINT "order_returns_requested_by_staff_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_returns" ADD CONSTRAINT "order_returns_updated_by_staff_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_returns_order_id_created_at_id_index" ON "commerce_admin"."order_returns" USING btree ("order_id","created_at","id");--> statement-breakpoint
CREATE INDEX "order_returns_item_id_index" ON "commerce_admin"."order_returns" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "commerce_admin"."payment_events" ADD CONSTRAINT "payment_events_return_id_order_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "commerce_admin"."order_returns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."payment_events" ADD CONSTRAINT "payment_events_return_id_unique" UNIQUE("return_id");