ALTER TABLE "commerce_admin"."stock_adjustments" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD COLUMN "before_levels" jsonb;--> statement-breakpoint
ALTER TABLE "commerce_admin"."stock_adjustments" ADD COLUMN "after_levels" jsonb;