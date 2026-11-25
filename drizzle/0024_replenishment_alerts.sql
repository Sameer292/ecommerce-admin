CREATE TABLE "commerce_admin"."replenishment_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "commerce_admin"."replenishment_alerts" ADD CONSTRAINT "replenishment_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "commerce_admin"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_admin"."replenishment_alerts" ADD CONSTRAINT "replenishment_alerts_acknowledged_by_staff_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "commerce_admin"."staff_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "replenishment_alerts_open_product" ON "commerce_admin"."replenishment_alerts" USING btree ("product_id") WHERE "commerce_admin"."replenishment_alerts"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "replenishment_alerts_opened_at_id_index" ON "commerce_admin"."replenishment_alerts" USING btree ("opened_at","id") WHERE "commerce_admin"."replenishment_alerts"."resolved_at" IS NULL;
--> statement-breakpoint
CREATE FUNCTION commerce_admin.update_replenishment_alert() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.stock - NEW.reserved_stock - NEW.damaged_stock <= NEW.low_stock_threshold THEN
    INSERT INTO commerce_admin.replenishment_alerts (product_id) VALUES (NEW.id)
    ON CONFLICT (product_id) WHERE resolved_at IS NULL DO NOTHING;
  ELSE
    UPDATE commerce_admin.replenishment_alerts SET resolved_at = now()
    WHERE product_id = NEW.id AND resolved_at IS NULL;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_replenishment
AFTER INSERT OR UPDATE OF status, stock, reserved_stock, damaged_stock, low_stock_threshold
ON commerce_admin.products FOR EACH ROW EXECUTE FUNCTION commerce_admin.update_replenishment_alert();
--> statement-breakpoint
INSERT INTO commerce_admin.replenishment_alerts (product_id)
SELECT id FROM commerce_admin.products
WHERE status = 'active' AND stock - reserved_stock - damaged_stock <= low_stock_threshold
ON CONFLICT (product_id) WHERE resolved_at IS NULL DO NOTHING;
