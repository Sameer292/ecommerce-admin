ALTER TABLE "commerce_admin"."orders" ADD COLUMN "buyer_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."orders" ADD COLUMN "buyer_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."orders" ADD COLUMN "buyer_phone" text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE "commerce_admin"."orders" AS orders
SET "buyer_name" = customers."name", "buyer_email" = customers."email", "buyer_phone" = customers."phone"
FROM "commerce_admin"."customers" AS customers
WHERE orders."customer_id" = customers."id";
