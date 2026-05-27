CREATE TABLE IF NOT EXISTS "asset_alert_rule_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "utility_alert_rule_id" uuid NOT NULL REFERENCES "ut_alert_rules"("id") ON DELETE CASCADE,
  "is_disabled" boolean NOT NULL DEFAULT false,
  "override_value" text,
  "override_severity" "severity",
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "asset_extra_alert_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "utility_type_id" uuid NOT NULL REFERENCES "utility_types"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "field_name" text NOT NULL,
  "condition" "condition" NOT NULL,
  "value" text NOT NULL,
  "severity" "severity" NOT NULL DEFAULT 'medium',
  "action" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
