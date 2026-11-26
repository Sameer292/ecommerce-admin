CREATE TABLE "commerce_admin"."stock_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."stock_reservations" (
	"number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "stock_reservations_number_product_id_pk" PRIMARY KEY("number","product_id"),
	CONSTRAINT "stock_reservations_positive_quantity" CHECK ("commerce_admin"."stock_reservations"."quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_reservations" ADD CONSTRAINT "stock_reservations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce_admin"."products"("id") ON DELETE restrict ON UPDATE no action;