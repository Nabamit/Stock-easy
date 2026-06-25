-- Stock Easy: Discount clusters, subscription plans, payments

CREATE TABLE discount_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS discount_cluster_id UUID REFERENCES discount_clusters(id) ON DELETE SET NULL;

ALTER TABLE bill_items
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(12,2) NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id),
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  amount NUMERIC(12,2) NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE discount_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_clusters_shop ON discount_clusters
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

CREATE POLICY subscription_plans_read ON subscription_plans
  FOR SELECT USING (TRUE);

CREATE POLICY subscription_plans_admin ON subscription_plans
  FOR ALL USING (is_central_admin());

CREATE POLICY subscription_payments_shop ON subscription_payments
  FOR ALL USING (shop_id = auth_shop_id() OR is_central_admin());

-- Default subscription plans
INSERT INTO subscription_plans (name, price, duration_months, description, features) VALUES
  ('Starter', 999, 1, 'For small pharmacies', '["FEFO Billing", "Up to 500 medicines", "Basic analytics"]'),
  ('Professional', 1999, 1, 'Most popular', '["Everything in Starter", "AI Assistant", "Staff accounts", "Advanced analytics"]'),
  ('Enterprise', 4999, 1, 'For multi-counter pharmacies', '["Everything in Pro", "Priority support", "Unlimited staff", "Custom reports"]')
ON CONFLICT (name) DO NOTHING;
