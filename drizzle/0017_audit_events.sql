CREATE TABLE "commerce_admin"."audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"subject" text NOT NULL,
	"record_id" text NOT NULL,
	"record_label" text NOT NULL,
	"action" text NOT NULL,
	"fields" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_created_at_id_index" ON "commerce_admin"."audit_events" USING btree ("created_at","id");
--> statement-breakpoint
CREATE FUNCTION "commerce_admin"."record_audit_event"() RETURNS trigger
LANGUAGE plpgsql SET search_path TO pg_catalog
AS $$
DECLARE
  previous jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  current_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  changed text[];
  record_id text := coalesce(current_row->>'id', previous->>'id');
  record_label text := coalesce(current_row->>TG_ARGV[0], previous->>TG_ARGV[0], record_id);
BEGIN
  SELECT coalesce(array_agg(key ORDER BY key), ARRAY[]::text[]) INTO changed
  FROM unnest(TG_ARGV) AS field(key)
  WHERE (previous->key) IS DISTINCT FROM (current_row->key);
  IF TG_OP = 'UPDATE' AND cardinality(changed) = 0 THEN
    RETURN NULL;
  END IF;
  IF TG_TABLE_NAME = 'payment_events' THEN
    record_id := coalesce(current_row->>'order_id', previous->>'order_id');
    SELECT number INTO record_label FROM commerce_admin.orders WHERE id = record_id::uuid;
  END IF;
  INSERT INTO commerce_admin.audit_events (actor_id, subject, record_id, record_label, action, fields)
  VALUES (
    nullif(current_setting('commerce_admin.actor_id', true), ''),
    TG_TABLE_NAME, record_id, coalesce(record_label, record_id), lower(TG_OP), changed
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON "commerce_admin"."products"
FOR EACH ROW EXECUTE FUNCTION "commerce_admin"."record_audit_event"(
  'sku','name','slug','description','image_url','category_id','status','price_minor','low_stock_threshold'
);
--> statement-breakpoint
CREATE TRIGGER categories_audit AFTER INSERT OR UPDATE OR DELETE ON "commerce_admin"."categories"
FOR EACH ROW EXECUTE FUNCTION "commerce_admin"."record_audit_event"('slug','name','description','icon');
--> statement-breakpoint
CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE OR DELETE ON "commerce_admin"."orders"
FOR EACH ROW EXECUTE FUNCTION "commerce_admin"."record_audit_event"(
  'number','status','payment_status','cash_on_delivery','shipping_name','shipping_address','tracking_number','notes'
);
--> statement-breakpoint
CREATE TRIGGER payments_audit AFTER INSERT OR UPDATE OR DELETE ON "commerce_admin"."payment_events"
FOR EACH ROW EXECUTE FUNCTION "commerce_admin"."record_audit_event"(
  'status','amount_minor','occurred_at','source','method','external_id','return_id'
);
--> statement-breakpoint
CREATE TRIGGER staff_audit AFTER INSERT OR UPDATE OR DELETE ON "commerce_admin"."staff_user"
FOR EACH ROW EXECUTE FUNCTION "commerce_admin"."record_audit_event"('id','name','email','role','banned','auth_user_id');
