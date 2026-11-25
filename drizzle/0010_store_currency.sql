CREATE TABLE "commerce_admin"."store_currency" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"currency" text NOT NULL,
	CONSTRAINT "store_currency_singleton" CHECK ("commerce_admin"."store_currency"."id" = 1),
	CONSTRAINT "store_currency_iso_code" CHECK ("commerce_admin"."store_currency"."currency" ~ '^[A-Z]{3}$')
);
