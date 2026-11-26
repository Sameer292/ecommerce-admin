CREATE TABLE "commerce_admin"."product_slugs" (
	"slug" text PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."products" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_admin"."product_slugs" ADD CONSTRAINT "product_slugs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce_admin"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_slugs_product_id_index" ON "commerce_admin"."product_slugs" USING btree ("product_id");
--> statement-breakpoint
UPDATE commerce_admin.products AS product SET published_at = product.created_at
WHERE product.status IN ('active', 'archived') OR EXISTS (
  SELECT 1 FROM commerce_admin.order_items AS line WHERE line.product_id = product.id
);
--> statement-breakpoint
INSERT INTO commerce_admin.product_slugs (slug, product_id)
SELECT slug, id FROM commerce_admin.products;
--> statement-breakpoint
CREATE FUNCTION commerce_admin.retain_published_sku() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL THEN
    IF NEW.sku IS DISTINCT FROM OLD.sku THEN
      RAISE EXCEPTION 'Published product SKU is fixed' USING ERRCODE = '23514';
    END IF;
    NEW.published_at := OLD.published_at;
  END IF;
  IF NEW.status = 'active' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_retain_published_sku BEFORE INSERT OR UPDATE OF status, sku, published_at
ON commerce_admin.products FOR EACH ROW EXECUTE FUNCTION commerce_admin.retain_published_sku();
--> statement-breakpoint
CREATE FUNCTION commerce_admin.retain_product_slug() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.slug = NEW.slug THEN RETURN NULL; END IF;
    IF OLD.published_at IS NULL THEN
      DELETE FROM commerce_admin.product_slugs WHERE slug = OLD.slug AND product_id = OLD.id;
    END IF;
  END IF;
  INSERT INTO commerce_admin.product_slugs AS existing (slug, product_id) VALUES (NEW.slug, NEW.id)
  ON CONFLICT (slug) DO UPDATE SET product_id = EXCLUDED.product_id
  WHERE existing.product_id = EXCLUDED.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product slug is already reserved' USING ERRCODE = '23505';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_retain_slug AFTER INSERT OR UPDATE OF slug
ON commerce_admin.products FOR EACH ROW EXECUTE FUNCTION commerce_admin.retain_product_slug();
