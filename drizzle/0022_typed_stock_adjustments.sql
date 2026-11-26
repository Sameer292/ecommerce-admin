ALTER TABLE "commerce_admin"."stock_adjustments" DROP CONSTRAINT "stock_adjustments_nonzero";--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD COLUMN "quantity" integer;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD CONSTRAINT "stock_adjustments_nonzero_or_typed" CHECK ("commerce_admin"."stock_adjustments"."delta" <> 0 OR "commerce_admin"."stock_adjustments"."kind" IS NOT NULL);