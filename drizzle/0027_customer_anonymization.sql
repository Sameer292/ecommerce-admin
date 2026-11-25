ALTER TYPE "commerce_admin"."notification_status" ADD VALUE 'suppressed';--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "anonymized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "anonymized_by" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD CONSTRAINT "customers_anonymized_by_staff_user_id_fk" FOREIGN KEY ("anonymized_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;