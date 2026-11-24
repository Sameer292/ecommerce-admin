DROP INDEX "commerce_admin"."products_name_id_index";--> statement-breakpoint
DROP INDEX "commerce_admin"."products_category_id_name_id_index";--> statement-breakpoint
DROP INDEX "commerce_admin"."products_status_name_id_index";--> statement-breakpoint
CREATE INDEX "products_name_id_index" ON "commerce_admin"."products" USING btree (lower("name"),"id");--> statement-breakpoint
CREATE INDEX "products_category_id_name_id_index" ON "commerce_admin"."products" USING btree ("category_id",lower("name"),"id");--> statement-breakpoint
CREATE INDEX "products_status_name_id_index" ON "commerce_admin"."products" USING btree ("status",lower("name"),"id");