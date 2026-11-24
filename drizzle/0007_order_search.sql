CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "customers_name_search_index" ON "commerce_admin"."customers" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "customers_email_search_index" ON "commerce_admin"."customers" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "orders_number_search_index" ON "commerce_admin"."orders" USING gin ("number" gin_trgm_ops);
