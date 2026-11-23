CREATE SCHEMA "commerce_admin";
--> statement-breakpoint
CREATE TABLE "commerce_admin"."staff_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."staff_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "staff_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."staff_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "staff_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."staff_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "staff_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."staff_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_admin"."store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"time_zone" text NOT NULL,
	CONSTRAINT "store_settings_singleton" CHECK ("commerce_admin"."store_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_account" ADD CONSTRAINT "staff_account_user_id_staff_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."staff_session" ADD CONSTRAINT "staff_session_user_id_staff_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_account_user_id_index" ON "commerce_admin"."staff_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_session_user_id_index" ON "commerce_admin"."staff_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "staff_verification_identifier_index" ON "commerce_admin"."staff_verification" USING btree ("identifier");