CREATE TYPE "commerce_admin"."sync_operation" AS ENUM('import', 'payment');--> statement-breakpoint
CREATE TABLE "commerce_admin"."order_sync" (
	"order_number" text NOT NULL,
	"operation" "commerce_admin"."sync_operation" NOT NULL,
	"status" integer NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "order_sync_order_number_operation_pk" PRIMARY KEY("order_number","operation")
);
--> statement-breakpoint
CREATE INDEX "order_sync_attempted_at_index" ON "commerce_admin"."order_sync" USING btree ("attempted_at") WHERE "commerce_admin"."order_sync"."status" >= 400;