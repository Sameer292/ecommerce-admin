ALTER TABLE "commerce_admin"."products" ALTER COLUMN "low_stock_threshold" SET DEFAULT 10;
--> statement-breakpoint
UPDATE "commerce_admin"."products" SET "low_stock_threshold" = 10 WHERE "low_stock_threshold" <> 10;
--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD CONSTRAINT "products_fixed_low_stock_threshold" CHECK ("commerce_admin"."products"."low_stock_threshold" = 10);
