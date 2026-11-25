CREATE TABLE "commerce_admin"."order_shipments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"staff_id" text,
	"carrier" text NOT NULL,
	"service" text DEFAULT '' NOT NULL,
	"tracking_number" text DEFAULT '' NOT NULL,
	"tracking_url" text DEFAULT '' NOT NULL,
	"dispatched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."shipment_items" (
	"shipment_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "shipment_items_shipment_id_item_id_pk" PRIMARY KEY("shipment_id","item_id"),
	CONSTRAINT "shipment_items_positive_quantity" CHECK ("commerce_admin"."shipment_items"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_shipments" ADD CONSTRAINT "order_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_shipments" ADD CONSTRAINT "order_shipments_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_order_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "commerce_admin"."order_shipments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."shipment_items" ADD CONSTRAINT "shipment_items_item_id_order_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "commerce_admin"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_shipments_order_id_dispatched_at_id_index" ON "commerce_admin"."order_shipments" USING btree ("order_id","dispatched_at","id");--> statement-breakpoint
CREATE INDEX "shipment_items_item_id_index" ON "commerce_admin"."shipment_items" USING btree ("item_id");