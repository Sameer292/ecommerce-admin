ALTER TABLE "commerce_admin"."staff_user" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."categories" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."store_settings" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;