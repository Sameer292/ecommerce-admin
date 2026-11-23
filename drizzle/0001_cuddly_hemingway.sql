CREATE TYPE "commerce_admin"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "commerce_admin"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"category_id" uuid,
	"status" "commerce_admin"."product_status" DEFAULT 'draft' NOT NULL,
	"price_minor" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_nonnegative_values" CHECK ("commerce_admin"."products"."price_minor" >= 0 AND "commerce_admin"."products"."stock" >= 0 AND "commerce_admin"."products"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."stock_adjustments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"staff_id" text,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_adjustments_nonzero" CHECK ("commerce_admin"."stock_adjustments"."delta" <> 0)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "commerce_admin"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce_admin"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_name_id_index" ON "commerce_admin"."categories" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "products_name_id_index" ON "commerce_admin"."products" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "products_category_id_name_id_index" ON "commerce_admin"."products" USING btree ("category_id","name","id");--> statement-breakpoint
CREATE INDEX "products_status_name_id_index" ON "commerce_admin"."products" USING btree ("status","name","id");--> statement-breakpoint
CREATE INDEX "products_low_stock" ON "commerce_admin"."products" USING btree ("stock","id") WHERE "commerce_admin"."products"."stock" <= "commerce_admin"."products"."low_stock_threshold" AND "commerce_admin"."products"."status" = 'active';--> statement-breakpoint
CREATE INDEX "stock_adjustments_product_id_created_at_id_index" ON "commerce_admin"."stock_adjustments" USING btree ("product_id","created_at","id");