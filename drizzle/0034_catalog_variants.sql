ALTER TABLE "commerce_admin"."products" ADD COLUMN "variant_of" uuid;--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD COLUMN "variant_key" text;--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD COLUMN "variant_options" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD CONSTRAINT "products_variant_of_products_id_fk" FOREIGN KEY ("variant_of") REFERENCES "commerce_admin"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD CONSTRAINT "products_variant_of_variant_key_unique" UNIQUE("variant_of","variant_key");--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD CONSTRAINT "products_variant_details" CHECK (("commerce_admin"."products"."variant_of" IS NULL AND "commerce_admin"."products"."variant_key" IS NULL AND jsonb_array_length("commerce_admin"."products"."variant_options") = 0) OR ("commerce_admin"."products"."variant_of" IS NOT NULL AND "commerce_admin"."products"."variant_of" <> "commerce_admin"."products"."id" AND "commerce_admin"."products"."variant_key" IS NOT NULL AND jsonb_array_length("commerce_admin"."products"."variant_options") BETWEEN 1 AND 5));
--> statement-breakpoint
DROP TRIGGER products_audit ON commerce_admin.products;
--> statement-breakpoint
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON commerce_admin.products
FOR EACH ROW EXECUTE FUNCTION commerce_admin.record_audit_event(
  'sku','name','slug','description','image_url','image_key','category_id','status','price_minor','low_stock_threshold','variant_of','variant_options'
);
