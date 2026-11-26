CREATE TABLE "commerce_admin"."staff_password_grants" (
	"session_id" uuid PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_password_grants" ADD CONSTRAINT "staff_password_grants_staff_id_staff_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE cascade ON UPDATE no action;