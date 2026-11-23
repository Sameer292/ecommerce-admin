CREATE TYPE "commerce_admin"."order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "commerce_admin"."payment_status" AS ENUM('pending', 'paid', 'refunded');--> statement-breakpoint
CREATE TABLE "commerce_admin"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_email_normalized" CHECK ("commerce_admin"."customers"."email" = lower(trim("commerce_admin"."customers"."email")))
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"staff_id" text,
	"previous_status" "commerce_admin"."order_status" NOT NULL,
	"status" "commerce_admin"."order_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	CONSTRAINT "order_items_nonnegative_values" CHECK ("commerce_admin"."order_items"."quantity" > 0 AND "commerce_admin"."order_items"."unit_price_minor" >= 0 AND "commerce_admin"."order_items"."quantity"::bigint * "commerce_admin"."order_items"."unit_price_minor" <= 2147483647)
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "commerce_admin"."order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "commerce_admin"."payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"subtotal_minor" integer NOT NULL,
	"shipping_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"shipping_name" text DEFAULT '' NOT NULL,
	"shipping_address" text DEFAULT '' NOT NULL,
	"tracking_number" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_money_nonnegative" CHECK ("commerce_admin"."orders"."subtotal_minor" >= 0 AND "commerce_admin"."orders"."shipping_minor" >= 0 AND "commerce_admin"."orders"."tax_minor" >= 0 AND "commerce_admin"."orders"."discount_minor" >= 0 AND "commerce_admin"."orders"."total_minor" >= 0),
	CONSTRAINT "orders_total_matches_components" CHECK ("commerce_admin"."orders"."total_minor" = "commerce_admin"."orders"."subtotal_minor"::bigint + "commerce_admin"."orders"."shipping_minor" + "commerce_admin"."orders"."tax_minor" - "commerce_admin"."orders"."discount_minor"),
	CONSTRAINT "orders_paid_timestamp_present" CHECK ("commerce_admin"."orders"."payment_status" = 'pending' OR "commerce_admin"."orders"."paid_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_events" ADD CONSTRAINT "order_events_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "commerce_admin"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce_admin"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "commerce_admin"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_id_index" ON "commerce_admin"."customers" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "customers_created_at_index" ON "commerce_admin"."customers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_events_order_id_created_at_id_index" ON "commerce_admin"."order_events" USING btree ("order_id","created_at","id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_id_index" ON "commerce_admin"."order_items" USING btree ("order_id","id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_index" ON "commerce_admin"."order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_id_index" ON "commerce_admin"."orders" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_id_index" ON "commerce_admin"."orders" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_created_at_id_index" ON "commerce_admin"."orders" USING btree ("customer_id","created_at","id");--> statement-breakpoint
CREATE INDEX "orders_paid_at_index" ON "commerce_admin"."orders" USING btree ("paid_at") WHERE "commerce_admin"."orders"."payment_status" = 'paid';