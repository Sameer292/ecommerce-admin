CREATE TABLE "commerce_admin"."customer_identities" (
	"external_id" text PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "merged_into" uuid;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "merged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "merged_by" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD COLUMN "merge_reason" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customer_identities" ADD CONSTRAINT "customer_identities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "commerce_admin"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_identities_customer_id_index" ON "commerce_admin"."customer_identities" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD CONSTRAINT "customers_merged_into_customers_id_fk" FOREIGN KEY ("merged_into") REFERENCES "commerce_admin"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD CONSTRAINT "customers_merged_by_staff_user_id_fk" FOREIGN KEY ("merged_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_merged_into_index" ON "commerce_admin"."customers" USING btree ("merged_into");--> statement-breakpoint
ALTER TABLE "commerce_admin"."customers" ADD CONSTRAINT "customers_distinct_merge_target" CHECK ("commerce_admin"."customers"."merged_into" <> "commerce_admin"."customers"."id");