CREATE TYPE "commerce_admin"."integration_scope" AS ENUM('catalog:read', 'orders:read', 'orders:import', 'payments:write', 'inventory:write', 'inventory:alerts', 'notifications:write');--> statement-breakpoint
CREATE TABLE "commerce_admin"."integration_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"digest" text NOT NULL,
	"scopes" "commerce_admin"."integration_scope"[] NOT NULL,
	"legacy" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"request_count" bigint DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone,
	"window_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "integration_keys_digest_unique" UNIQUE("digest")
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."integration_keys" ADD CONSTRAINT "integration_keys_created_by_staff_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;