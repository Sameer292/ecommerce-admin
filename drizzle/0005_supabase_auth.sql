-- Archive previous auth data for rollbacks while keeping it outside the app schema.
CREATE SCHEMA "commerce_admin_legacy_auth";--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_account" SET SCHEMA "commerce_admin_legacy_auth";--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_rate_limit" SET SCHEMA "commerce_admin_legacy_auth";--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_session" SET SCHEMA "commerce_admin_legacy_auth";--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_verification" SET SCHEMA "commerce_admin_legacy_auth";--> statement-breakpoint
REVOKE ALL ON SCHEMA "commerce_admin", "commerce_admin_legacy_auth" FROM PUBLIC, "anon", "authenticated";--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_user" ADD COLUMN "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_user" ADD CONSTRAINT "staff_user_auth_user_id_users_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_user" ADD CONSTRAINT "staff_user_auth_user_id_unique" UNIQUE("auth_user_id");
